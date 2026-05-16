export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  FreelancerSetup: undefined;
  ClientSetup: undefined;
  Main: undefined;
  JobDetail: { jobId: string };
  MyJobs: undefined;
  MyBids: undefined;
  Notifications: undefined;
  ChatRoom: { roomId: string; title?: string };
  Earnings: undefined;
  Payments: undefined;
  AdminDashboard: undefined;
  Disputes: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  PostJob: undefined;
  Workspace: undefined;
  Inbox: undefined;
  Profile: undefined;
};
