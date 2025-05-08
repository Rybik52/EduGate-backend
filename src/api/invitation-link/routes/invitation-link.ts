/**
 * invitation-link router
 */

export default {
  routes: [
    {
      method: "GET",
      path: "/invitation-links",
      handler: "invitation-link.find",
    },
    // Добавляем маршрут для получения приглашений текущего пользователя
    {
      method: "GET",
      path: "/my-invitation-links",
      handler: "invitation-link.findMyInvitations",
    },
    // Оставьте остальные стандартные маршруты
    {
      method: "GET",
      path: "/invitation-links/:id",
      handler: "invitation-link.findOne",
      config: {
        populate: {
          visitor: true,
          created_by_user: true,
        },
      },
    },
    {
      method: "POST",
      path: "/invitation-links",
      handler: "invitation-link.create",
    },
    {
      method: "PUT",
      path: "/invitation-links/:id",
      handler: "invitation-link.update",
    },
    {
      method: "DELETE",
      path: "/invitation-links/:id",
      handler: "invitation-link.delete",
    },
    // Добавляем маршрут для обновления статуса приглашения
    {
      method: "PUT",
      path: "/invitation-links/:id/status",
      handler: "invitation-link.updateStatus",
    },
  ],
};
