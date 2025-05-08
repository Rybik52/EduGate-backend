import { factories } from "@strapi/strapi";
import { v4 as uuidv4 } from "uuid";
import { errors } from "@strapi/utils";

const { ApplicationError, NotFoundError } = errors;

interface VisitorData {
  firstName: string;
  lastName?: string;
  surname: string;
  email: string;
  persone_roles?: number[];
}

interface InvitationLinkData {
  id: number;
  token: string;
  link_status: "На рассмотрении" | "Одобрено" | "Отказано";
  validFrom: Date;
  validTo: Date;
  visitor_data: VisitorData;
  created_by_user?: number;
  visitor?: number;
}

export default factories.createCoreController(
  "api::invitation-link.invitation-link",
  ({ strapi }) => ({
    // Создание новой пригласительной ссылки
    async create(ctx) {
      try {
        const { visitor_data, validFrom, validTo } = ctx.request.body.data;

        // Проверка наличия необходимых данных
        if (!visitor_data || !validFrom || !validTo) {
          throw new ApplicationError("Отсутствуют необходимые данные");
        }

        // Генерация уникального токена
        const token = uuidv4();

        // Получение текущего пользователя
        const user = ctx.state.user;

        // Создание записи пригласительной ссылки
        const invitationLink = await strapi.db
          .query("api::invitation-link.invitation-link")
          .create({
            data: {
              token,
              link_status: "На рассмотрении",
              validFrom,
              validTo,
              visitor_data,
              created_by_user: user.id,
              publishedAt: new Date(),
            },
          });

        return { data: invitationLink };
      } catch (err) {
        return ctx.badRequest(err.message);
      }
    },

    // Получение списка пригласительных ссылок текущего пользователя
    async findMyInvitations(ctx) {
      try {
        const user = ctx.state.user;

        const invitations = await strapi.db
          .query("api::invitation-link.invitation-link")
          .findMany({
            where: {
              created_by_user: user.id,
            },
            orderBy: { createdAt: "desc" },
            populate: {
              visitor: {
                select: ["id", "firstName", "lastName", "surname", "email"],
              },
              created_by_user: {
                select: ["id", "username", "email"],
              },
            },
          });

        return { data: invitations };
      } catch (err) {
        return ctx.badRequest(err.message);
      }
    },

    // Обновление статуса пригласительной ссылки
    async updateStatus(ctx) {
      try {
        const { id } = ctx.params;
        const { status } = ctx.request.body;

        if (!["На рассмотрении", "Одобрено", "Отказано"].includes(status)) {
          throw new ApplicationError("Неверный статус");
        }

        const invitation = await strapi.db
          .query("api::invitation-link.invitation-link")
          .findOne({
            where: { id },
          });

        if (!invitation) {
          throw new NotFoundError("Пригласительная ссылка не найдена");
        }

        // Если статус меняется на "Одобрено", создаем посетителя
        if (status === "Одобрено" && invitation.link_status !== "Одобрено") {
          // Создаем посетителя на основе данных из пригласительной ссылки
          const visitorData = invitation.visitor_data as VisitorData;

          const visitor = await strapi.db.query("api::visitor.visitor").create({
            data: {
              surname: visitorData.surname,
              firstName: visitorData.firstName,
              lastName: visitorData.lastName || null,
              email: visitorData.email,
              persone_roles: visitorData.persone_roles || [],
              publishedAt: new Date(),
            },
          });

          // Обновляем пригласительную ссылку, связывая ее с созданным посетителем
          await strapi.db.query("api::invitation-link.invitation-link").update({
            where: { id },
            data: {
              link_status: status as InvitationLinkData["link_status"],
              visitor: visitor.id,
            },
          });

          return {
            data: {
              invitation: {
                ...invitation,
                link_status: status,
                visitor,
              },
            },
          };
        }

        // Обновляем только статус
        const updatedInvitation = await strapi.db
          .query("api::invitation-link.invitation-link")
          .update({
            where: { id },
            data: {
              link_status: status as InvitationLinkData["link_status"],
            },
          });

        return { data: updatedInvitation };
      } catch (err) {
        if (err instanceof NotFoundError) {
          return ctx.notFound(err.message);
        }
        return ctx.badRequest(err.message);
      }
    },

    // Активация пригласительной ссылки по токену
    async activateByToken(ctx) {
      try {
        const { token } = ctx.params;

        const invitations = await strapi.db
          .query("api::invitation-link.invitation-link")
          .findMany({
            where: {
              token,
              link_status: "Одобрено",
            },
            populate: {
              visitor: {
                select: ["id", "firstName", "lastName", "surname", "email"],
              },
            },
          });

        if (!invitations || invitations.length === 0) {
          throw new NotFoundError(
            "Пригласительная ссылка не найдена или не активирована",
          );
        }

        const currentInvitation = invitations[0];

        // Проверка срока действия ссылки
        const now = new Date();
        const validFrom = new Date(currentInvitation.validFrom);
        const validTo = new Date(currentInvitation.validTo);

        if (now < validFrom || now > validTo) {
          throw new ApplicationError(
            "Срок действия пригласительной ссылки истек",
          );
        }

        return {
          data: {
            valid: true,
            visitor: currentInvitation.visitor,
            validFrom: currentInvitation.validFrom,
            validTo: currentInvitation.validTo,
          },
        };
      } catch (err) {
        if (err instanceof NotFoundError) {
          return ctx.notFound(err.message);
        }
        return ctx.badRequest(err.message);
      }
    },

    // Переопределение метода удаления
    async delete(ctx) {
      try {
        const { id } = ctx.params;

        // Проверяем существование записи перед удалением
        const invitation = await strapi.db
          .query("api::invitation-link.invitation-link")
          .findOne({
            where: { id },
          });

        if (!invitation) {
          throw new NotFoundError("Пригласительная ссылка не найдена");
        }

        // Получаем текущего пользователя
        const user = ctx.state.user;

        // Проверяем, является ли пользователь создателем ссылки (если нужно)
        // Если пользователь не админ, проверяем, что он создатель ссылки
        if (invitation.created_by_user !== user.id) {
          return ctx.forbidden(
            "У вас нет прав на удаление этой пригласительной ссылки",
          );
        }

        // Выполняем удаление
        const deletedInvitation = await strapi.db
          .query("api::invitation-link.invitation-link")
          .delete({
            where: { id },
          });

        if (!deletedInvitation) {
          throw new ApplicationError(
            "Не удалось удалить пригласительную ссылку",
          );
        }

        return { data: deletedInvitation };
      } catch (err) {
        if (err instanceof NotFoundError) {
          return ctx.notFound(err.message);
        }
        return ctx.badRequest(err.message);
      }
    },
    // Переопределение стандартного метода find для получения всех приглашений
    async find(ctx) {
      try {
        // Вызываем оригинальный метод find
        const { data, meta } = await super.find(ctx);

        // Получаем все приглашения с заполненными связями
        const invitations = await strapi.db
          .query("api::invitation-link.invitation-link")
          .findMany({
            orderBy: { createdAt: "desc" },
            populate: {
              visitor: {
                select: ["id", "firstName", "lastName", "surname", "email"],
              },
              created_by_user: {
                select: ["id", "username", "email"],
              },
            },
          });

        // Возвращаем данные с заполненными связями
        return { data: invitations, meta };
      } catch (err) {
        return ctx.badRequest(err.message);
      }
    },
  }),
);
