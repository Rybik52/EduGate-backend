export default {
  routes: [
    {
      method: "GET",
      path: "/visitors/by-role",
      handler: "visitor.findByRole",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/visitors/search",
      handler: "visitor.search",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/visitors/categories",
      handler: "visitor.getVisitorCategories",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/visitors/:id/detailed",
      handler: "visitor.findOneDetailed",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/visitors/:id/attendance-history",
      handler: "visitor.getAttendanceHistory",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/visitors",
      handler: "visitor.find",
    },
    {
      method: "GET",
      path: "/visitors/:id",
      handler: "visitor.findOne",
    },
    {
      method: "POST",
      path: "/visitors",
      handler: "visitor.create",
    },
    {
      method: "PUT",
      path: "/visitors/:id",
      handler: "visitor.update",
    },
    {
      method: "DELETE",
      path: "/visitors/:id",
      handler: "visitor.delete",
    },
  ],
};
