"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/students-groups/stats/stream",
      handler: "students-group.streamStats",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/students-groups",
      handler: "students-group.find",
    },
    {
      method: "GET",
      path: "/students-groups/:id",
      handler: "students-group.findOne",
    },
    {
      method: "POST",
      path: "/students-groups",
      handler: "students-group.create",
    },
    {
      method: "PUT",
      path: "/students-groups/:id",
      handler: "students-group.update",
    },
    {
      method: "DELETE",
      path: "/students-groups/:id",
      handler: "students-group.delete",
    },
  ],
};
