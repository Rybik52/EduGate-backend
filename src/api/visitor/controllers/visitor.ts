import { factories } from "@strapi/strapi";

interface Visitor {
  id: string;
  firstName?: string;
  lastName?: string;
  surname?: string;
  email?: string;
  avatar?: any;
  students_groups?: Array<{ id: string; name: string }>;
  positions?: Array<{ id: string; name: string }>;
  departaments?: Array<{ id: string; name: string }>;
  persone_roles?: Array<{ id: string; name: string }>;
  blocked: boolean;
}

interface VisitorWithAttendance extends Visitor {
  attendances?: Array<{
    entry_time: string;
    exit_time: string | null;
  }>;
}

interface AttendanceRecord {
  date: string;
  entries: {
    entry: string;
    exit: string | null;
  }[];
}

interface VisitorWithAttendanceResponse extends Visitor {
  attendances: Array<{
    id: number;
    entry_time: string;
    exit_time: string | null;
  }>;
}

export default factories.createCoreController(
  "api::visitor.visitor",
  ({ strapi }) => ({
    async search(ctx) {
      try {
        const { query = "" } = ctx.request.query;
        const searchTerms = (query as string).trim().split(/\s+/);

        const visitors = (await strapi.entityService.findMany(
          "api::visitor.visitor",
          {
            fields: [
              "id",
              "firstName",
              "lastName",
              "surname",
              "email",
              "blocked",
            ],
            filters: {
              $or: searchTerms.flatMap((term) => [
                {
                  surname: {
                    $containsi: term,
                  },
                },
                {
                  firstName: {
                    $containsi: term,
                  },
                },
                {
                  lastName: {
                    $containsi: term,
                  },
                },
                {
                  email: {
                    $containsi: term,
                  },
                },
                {
                  persone_roles: {
                    name: {
                      $containsi: term,
                    },
                  },
                },
              ]),
            },
            populate: {
              avatar: {
                fields: ["url", "name", "formats"],
              },
              persone_roles: {
                fields: ["name"],
              },
              positions: {
                fields: ["name"],
              },
              departaments: {
                fields: ["name"],
              },
              students_groups: {
                fields: ["name"],
              },
            },
          },
        )) as Visitor[];

        const result = {
          students: visitors.filter(
            (v) => v.students_groups && v.students_groups.length > 0,
          ),
          staff: visitors.filter((v) => v.positions && v.positions.length > 0),
          departmentMembers: visitors.filter(
            (v) => v.departaments && v.departaments.length > 0,
          ),
          other: visitors.filter(
            (v) =>
              (!v.students_groups || v.students_groups.length === 0) &&
              (!v.positions || v.positions.length === 0) &&
              (!v.departaments || v.departaments.length === 0) &&
              v.persone_roles &&
              v.persone_roles.length > 0,
          ),
        };

        ctx.body = result;
      } catch (err) {
        ctx.status = 500;
        ctx.body = { error: err.message };
      }
    },

    async findOneDetailed(ctx) {
      try {
        const { id } = ctx.params;

        const visitor = await strapi.entityService.findOne(
          "api::visitor.visitor",
          id,
          {
            fields: [
              "id",
              "firstName",
              "lastName",
              "surname",
              "email",
              "blocked",
            ],
            populate: {
              avatar: {
                fields: ["url", "name", "formats"],
              },
              persone_roles: {
                fields: ["name"],
              },
              positions: {
                fields: ["name"],
              },
              departaments: {
                fields: ["name"],
              },
              students_groups: {
                fields: ["name"],
              },
              locations: {
                fields: ["name"],
              },
            },
          },
        );

        ctx.body = visitor;
      } catch (err) {
        ctx.status = 500;
        ctx.body = { error: err.message };
      }
    },

    async findByRole(ctx) {
      try {
        const {
          role,
          position,
          page = 1,
          pageSize = 25,
          search = "",
        } = ctx.query;
        const searchTerms = (search as string).trim().split(/\s+/);

        let filters: any = {
          $and: [],
        };

        // Add role/position filters
        if (role) {
          filters.$and.push({
            persone_roles: {
              name: {
                $eq: role,
              },
            },
          });
        } else if (position) {
          filters.$and.push({
            positions: {
              name: {
                $eq: position,
              },
            },
          });
        }

        // Add search filters if search terms exist
        if (searchTerms[0] !== "") {
          filters.$and.push({
            $or: searchTerms.flatMap((term) => [
              { surname: { $containsi: term } },
              { firstName: { $containsi: term } },
              { lastName: { $containsi: term } },
              { email: { $containsi: term } },
            ]),
          });
        }

        // If no filters were added, remove the empty $and array
        if (filters.$and.length === 0) {
          filters = {};
        }

        const [visitors, count] = (await Promise.all([
          strapi.entityService.findMany("api::visitor.visitor", {
            fields: [
              "id",
              "firstName",
              "lastName",
              "surname",
              "email",
              "blocked",
            ],
            filters,
            populate: {
              students_groups: {
                fields: ["name"],
              },
              attendances: {
                fields: ["entry_time", "exit_time"],
                sort: [{ entry_time: "desc" }],
              },
              persone_roles: {
                fields: ["name"],
              },
              positions: {
                fields: ["name"],
              },
              avatar: {
                fields: ["url", "name", "formats"],
              },
            },
            orderBy: { createdAt: "desc" },
            pagination: {
              page: parseInt(page as string),
              pageSize: parseInt(pageSize as string),
            },
          }),
          strapi.entityService.count("api::visitor.visitor", { filters }),
        ])) as [VisitorWithAttendance[], number];

        const result = {
          data: visitors.map((visitor) => ({
            id: visitor.id,
            fullName:
              `${visitor.surname} ${visitor.firstName} ${visitor.lastName || ""}`.trim(),
            email: visitor.email,
            blocked: visitor.blocked,
            avatar: visitor.avatar,
            positions:
              visitor.positions?.map((position) => position.name) || [],
            group: visitor.students_groups?.[0]?.name || null,
            roles: visitor.persone_roles?.map((role) => role.name) || [],
            status:
              visitor.attendances?.[0]?.exit_time === null
                ? "present"
                : "absent",
            lastEntry: visitor.attendances?.[0]?.entry_time || null,
            lastExit: visitor.attendances?.[0]?.exit_time || null,
          })),
          pagination: {
            page: page,
            pageSize: pageSize,
            pageCount: Math.ceil(count / parseInt(pageSize as string)),
            total: count,
          },
        };

        ctx.body = result;
      } catch (err) {
        ctx.status = 500;
        ctx.body = { error: err.message };
      }
    },

    async getAttendanceHistory(ctx) {
      try {
        const { id } = ctx.params;

        const visitor = (await strapi.entityService.findOne<any, any>(
          "api::visitor.visitor",
          id,
          {
            populate: {
              attendances: {
                fields: ["entry_time", "exit_time"],
                sort: [{ entry_time: "desc" }],
              },
            },
          },
        )) as VisitorWithAttendanceResponse;

        if (!visitor) {
          ctx.status = 404;
          ctx.body = { error: "Visitor not found" };
          return;
        }

        if (!visitor.attendances?.length) {
          ctx.body = [];
          return;
        }

        // Group attendances by date
        const attendancesByDate = visitor.attendances.reduce<
          Record<string, AttendanceRecord>
        >((acc, attendance) => {
          const date = new Date(attendance.entry_time)
            .toISOString()
            .split("T")[0];

          if (!acc[date]) {
            acc[date] = {
              date,
              entries: [],
            };
          }

          acc[date].entries.push({
            entry: attendance.entry_time,
            exit: attendance.exit_time,
          });

          return acc;
        }, {});

        // Convert to array and sort by date descending
        const result = Object.values(attendancesByDate).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        ctx.body = result;
      } catch (err) {
        ctx.status = 500;
        ctx.body = { error: err.message };
      }
    },

    async getVisitorCategories(ctx) {
      try {
        // Получаем общее количество посетителей
        const totalVisitors = await strapi.entityService.count(
          "api::visitor.visitor",
          {},
        );

        // Получаем количество студентов (посетители, связанные с группами студентов)
        const studentsCount = await strapi.entityService.count(
          "api::visitor.visitor",
          {
            filters: {
              students_groups: {
                id: {
                  $notNull: true,
                },
              },
            },
          },
        );

        // Получаем количество преподавателей (посетители с должностью "Преподаватель")
        const teachersCount = await strapi.entityService.count(
          "api::visitor.visitor",
          {
            filters: {
              positions: {
                name: "Преподаватель",
              },
            },
          },
        );

        // Получаем количество сотрудников (посетители с ролью "Сотрудник")
        const employeesCount = await strapi.entityService.count(
          "api::visitor.visitor",
          {
            filters: {
              persone_roles: {
                name: "Сотрудник",
              },
            },
          },
        );

        // Получаем количество гостей (посетители с ролью "Гость")
        const guestsCount = await strapi.entityService.count(
          "api::visitor.visitor",
          {
            filters: {
              persone_roles: {
                name: "Гость",
              },
            },
          },
        );

        // Формируем ответ
        const categories = [
          {
            categoryName: "Все",
            categorySysName: "all",
            total: totalVisitors,
          },
          {
            categoryName: "Студенты",
            categorySysName: "students",
            total: studentsCount,
          },
          {
            categoryName: "Преподаватели",
            categorySysName: "teachers",
            total: teachersCount,
          },
          {
            categoryName: "Сотрудники",
            categorySysName: "employees",
            total: employeesCount,
          },
          {
            categoryName: "Гости",
            categorySysName: "guests",
            total: guestsCount,
          },
        ];

        ctx.body = categories;
      } catch (err) {
        ctx.status = 500;
        ctx.body = { error: err.message };
      }
    },
  }),
);
