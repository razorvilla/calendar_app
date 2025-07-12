const taskResolvers = {
  Query: {
    task: async (_, { id }, { dataSources }) => {
      return dataSources.eventAPI.getTask(id);
    },
    tasks: async (_, __, { dataSources }) => {
      return dataSources.eventAPI.getTasks();
    },
  },
  Mutation: {
    createTask: async (_, { input }, { dataSources }) => {
      return dataSources.eventAPI.createTask(input);
    },
    updateTask: async (_, { id, input }, { dataSources }) => {
      return dataSources.eventAPI.updateTask(id, input);
    },
    deleteTask: async (_, { id }, { dataSources }) => {
      return dataSources.eventAPI.deleteTask(id);
    },
  },
};

module.exports = taskResolvers;
