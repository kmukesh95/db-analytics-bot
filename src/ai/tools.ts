import { Type, Tool } from '@google/genai';

export const analyticsTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'getUserStatistics',
        description: 'Retrieves user counts from user_additional_roles filtered by role, active status, and state.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            roleName: {
              type: Type.STRING,
              description: 'Name of the user role, e.g. "State User", "District User", "Admin".',
            },
            status: {
              type: Type.STRING,
              description: 'Record status in user_additional_roles (e.g. "published", "draft"). Use "all" if not specified.',
            },
            isActive: {
              type: Type.INTEGER,
              description: '1 for active users, 0 for inactive users.',
            },
            stateId: {
              type: Type.INTEGER,
              description: 'Integer state identifier.',
            },
          },
        },
      },
      {
        name: 'getUserCountsGroupedByRole',
        description: 'Retrieves a summarized breakdown and distribution of users grouped by role name, status, and active state.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'getLearnerMetrics',
        description: 'Retrieves totals for learners, identified learners, and pass/certified learners from district records.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            stateId: {
              type: Type.INTEGER,
              description: 'State ID to filter metrics by.',
            },
            districtId: {
              type: Type.INTEGER,
              description: 'District ID to filter metrics by.',
            },
          },
        },
      },
    ],
  },
];