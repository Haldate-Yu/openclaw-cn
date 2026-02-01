import * as Lark from "@larksuiteoapi/node-sdk";
import { loadConfig } from "../config/config.js";
import { getChildLogger } from "../logging.js";
import type { FeishuConfig } from "../config/types.feishu.js";

const logger = getChildLogger({ module: "feishu-client" });
const DEFAULT_ACCOUNT_ID = "default";

export function getFeishuClient(accountIdOrAppId?: string, explicitAppSecret?: string) {
  const cfg = loadConfig();
  const feishuCfg = (cfg.channels as any)?.feishu as FeishuConfig | undefined;

  let appId: string | undefined;
  let appSecret: string | undefined = explicitAppSecret;

  // Determine if we received an accountId or an appId
  const isAppId = accountIdOrAppId?.startsWith("cli_");
  const accountId = isAppId ? undefined : accountIdOrAppId || DEFAULT_ACCOUNT_ID;

  if (!appSecret && feishuCfg?.accounts) {
    // Try to get from accounts config
    if (accountId && feishuCfg.accounts[accountId]) {
      const acc = feishuCfg.accounts[accountId];
      appId = acc.appId;
      appSecret = acc.appSecret;
    } else if (!accountId) {
      // Fallback to first account if accountId is not specified
      const firstKey = Object.keys(feishuCfg.accounts)[0];
      if (firstKey) {
        const acc = feishuCfg.accounts[firstKey];
        appId = acc.appId;
        appSecret = acc.appSecret;
      }
    }
  }

  // If accountIdOrAppId is an appId, use it directly
  if (isAppId) {
    appId = accountIdOrAppId;
  }

  // Fallback to top-level feishu config (for backward compatibility)
  if (!appId && feishuCfg?.appId) appId = feishuCfg.appId;
  if (!appSecret && feishuCfg?.appSecret) appSecret = feishuCfg.appSecret;

  // Environment variables fallback
  if (!appId) appId = process.env.FEISHU_APP_ID;
  if (!appSecret) appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error(
      "飞书 App ID 和 App Secret 未配置。请通过 'openclaw-cn onboard' 配置飞书通道，或设置 FEISHU_APP_ID/SECRET 环境变量。",
    );
  }

  const client = new Lark.Client({
    appId,
    appSecret,
    logger: {
      debug: (msg) => {
        logger.debug(msg);
      },
      info: (msg) => {
        logger.info(msg);
      },
      warn: (msg) => {
        logger.warn(msg);
      },
      error: (msg) => {
        logger.error(msg);
      },
      trace: (msg) => {
        logger.silly(msg);
      },
    },
  });

  return client;
}
