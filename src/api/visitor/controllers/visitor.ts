import { factories } from "@strapi/strapi";

interface Visitor {
  id: string;
  firstName?: string;
  lastName?: string;
  surname?: string;
  email?: string;
  students_groups?: Array<{ id: string; name: string }>;
  positions?: Array<{ id: string; name: string }>;
  departaments?: Array<{ id: string; name: string }>;
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
              ]),
            },
            populate: {
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
              (!v.departaments || v.departaments.length === 0),
          ),
        };

        ctx.body = result;
      } catch (err) {
        ctx.status = 500;
        ctx.body = { error: err.message };
      }
    },
  }),
);
