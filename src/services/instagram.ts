import dayjs from "dayjs";
import { getAllCookies } from "./chrome/cookies";

const GRAPH_QL_API = {
  X_IG_APP_ID: "936619743392459",
  block: {
    DOC_ID: "7889888917690727",
    FB_API_REQ_FRIENDLY_NAME: "usePolarisBlockManyMutation",
  },
  unblock: {
    DOC_ID: "7171453892977632",
    FB_API_REQ_FRIENDLY_NAME: "usePolarisUnblockManyMutation",
  },
};

function queryString(params: Record<string, string | object>) {
  return Object.keys(params)
    .map((key) => {
      if (typeof params[key] === "object") {
        return `${encodeURIComponent(key)}=${encodeURIComponent(
          JSON.stringify(params[key])
        )}`;
      }

      return `${encodeURIComponent(key)}=${encodeURIComponent(
        params[key] as string
      )}`;
    })
    .join("&");
}

export async function checkUserConnection() {
  const cookies = await getAllCookies("https://www.instagram.com");

  const sessionIDCookie = cookies.find(
    (cookie) => cookie.name === "sessionid"
  );

  if (!sessionIDCookie) {
    throw new Error("No sessionid found");
  }

  if (sessionIDCookie.expirationDate) {
    const expirationDate = dayjs(sessionIDCookie.expirationDate * 1000);
    const now = dayjs();

    if (expirationDate.isBefore(now)) {
      throw new Error("Session expired");
    }
  }

  return cookies;
}

export async function toggleBlockUser(id: string, action: "block" | "unblock") {
  const cookies = await checkUserConnection();

  const csrftoken = cookies.find(
    (cookie) => cookie.name === "csrftoken"
  )?.value;

  if (!csrftoken) {
    throw new Error("No csrftoken found");
  }

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-CSRFToken": csrftoken,
    Cookie: cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; "),
  };

  const body = {
    fb_api_req_friendly_name: GRAPH_QL_API[action].FB_API_REQ_FRIENDLY_NAME,
    doc_id: GRAPH_QL_API[action].DOC_ID,
    variables: {
      target_user_ids: [id],
    },
  };

  const raw = queryString(body);

  const response = await fetch("https://www.instagram.com/graphql/query/", {
    method: "POST",
    headers,
    body: raw,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `Instagram GraphQL request failed -- ${response.status} ${response.statusText}`
    );
  }

  const text = await response.text();

  let json: { errors?: { message?: string }[] };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      "Instagram GraphQL returned a non-JSON response (likely a login or challenge page)."
    );
  }

  if (json.errors?.length) {
    throw new Error(
      `Instagram GraphQL error: ${json.errors
        .map((error) => error.message)
        .join(", ")}`
    );
  }
}
