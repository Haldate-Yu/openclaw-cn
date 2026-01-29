export type FeishuAccountConfig = {
  appId: string;
  appSecret: string;
  botName?: string;
};

export type FeishuConfig = {
  accounts?: Record<string, FeishuAccountConfig>;
};
