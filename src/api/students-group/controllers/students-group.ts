"use strict";

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::students-group.students-group",
  ({ strapi }) => ({
    async getGroupsStats(ctx) {
      try {
        const groups = await strapi.entityService.findMany(
          "api::students-group.students-group",
          {
            fields: ["id", "name"],
            populate: {
              posetitels: {
                fields: ["id"],
              },
              attendances: {
                fields: ["exit_time"],
                filters: {
                  exit_time: {
                    $null: true,
                  },
                },
                populate: {
                  visitor: {
                    fields: ["id"],
                  },
                },
              },
            },
          },
        );

        const result = groups.map((group) => ({
          id: group.id,
          name: group.name,
          total: group.posetitels?.length || 0,
          present: group.attendances?.length || 0,
        }));

        ctx.body = result;
      } catch (err) {
        ctx.status = 500;
        ctx.body = { message: err.message };
      }
    },

    async streamStats(ctx) {
      ctx.set({
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      });

      ctx.status = 200;
      ctx.respond = false;
      const stream = ctx.res;

      const sendStats = async () => {
        try {
          const groups = await strapi.entityService.findMany(
            "api::students-group.students-group",
            {
              fields: ["id", "name"],
              populate: {
                posetitels: {
                  fields: ["id"],
                },
                attendances: {
                  fields: ["exit_time"],
                  filters: {
                    exit_time: {
                      $null: true,
                    },
                  },
                  populate: {
                    visitor: {
                      fields: ["id"],
                    },
                  },
                },
              },
            },
          );

          const result = groups.map((group) => {
            // Get unique visitor IDs from attendances
            const uniqueVisitorIds = new Set(
              group.attendances
                ?.map((attendance) => attendance.visitor?.id)
                .filter(Boolean),
            );

            return {
              id: group.id,
              name: group.name,
              total: group.posetitels?.length || 0,
              present: uniqueVisitorIds.size || 0,
            };
          });

          stream.write(`data: ${JSON.stringify(result)}\n\n`);
        } catch (error) {
          console.error("Error sending stats:", error);
        }
      };

      // Send initial data
      await sendStats();

      // Setup event handlers
      const handleModelChange = async () => {
        await sendStats();
      };

      // Subscribe to relevant model events
      strapi.eventHub.on("entry.create", handleModelChange);
      strapi.eventHub.on("entry.update", handleModelChange);
      strapi.eventHub.on("entry.delete", handleModelChange);

      // Cleanup on connection close
      ctx.req.on("close", () => {
        strapi.eventHub.off("entry.create", handleModelChange);
        strapi.eventHub.off("entry.update", handleModelChange);
        strapi.eventHub.off("entry.delete", handleModelChange);
      });
    },
  }),
);
