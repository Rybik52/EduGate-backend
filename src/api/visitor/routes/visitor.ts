module.exports = {
  routes: [
    {
      method: "GET",
      path: "/visitors/search",
      handler: "visitor.search",
      config: {
        policies: [],
      },
    },
  ],
};
