import type { Client } from "@larksuiteoapi/node-sdk";
import { getChildLogger } from "../logging.js";
import { loadConfig } from "../config/config.js";

const logger = getChildLogger({ module: "feishu-send" });

export type FeishuSendOpts = {
  msgType?: "text" | "image" | "post" | "interactive";
  receiveIdType?: "open_id" | "user_id" | "union_id" | "email" | "chat_id";
};

export async function sendMessageFeishu(
  client: Client,
  receiveId: string,
  content: any, // JSON object or string depending on msgType
  opts: FeishuSendOpts = {},
) {
  const receiveIdType = opts.receiveIdType || "chat_id"; // Default to chat_id
  const msgType = opts.msgType || "text";

  const contentStr = typeof content === "string" ? content : JSON.stringify(content);

  try {
    const res = await client.im.message.create({
      params: {
        receive_id_type: receiveIdType,
      },
      data: {
        receive_id: receiveId,
        msg_type: msgType,
        content: contentStr,
      },
    });

    if (res.code !== 0) {
      logger.error(`Feishu send failed: ${res.code} - ${res.msg}`);
      throw new Error(`Feishu API Error: ${res.msg}`);
    }
    return res.data;
  } catch (err) {
    logger.error(`Feishu send error: ${err}`);
    throw err;
  }
}
