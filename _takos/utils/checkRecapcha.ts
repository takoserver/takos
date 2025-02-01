import { load } from "@std/dotenv";
const env = await load();
const recapchav2_secret = env["RECAPCHA_V2_SECRET_KEY"];
const recapchav3_secret = env["RECAPCHA_V3_SECRET_KEY"];
const LimitScore = env["rechapcha_limit_score"];
export const checkRecapcha = async (
  recapchaToken: string,
  recapchaVersion: "v2" | "v3",
) => {
  if (recapchaVersion === "v2") {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${recapchav2_secret}&response=${recapchaToken}`,
      },
    );
    const result = await response.json();
    if (!result.success) {
      return false;
    }
    return true;
  }
  if (recapchaVersion === "v3") {
    const isSecsusRechapcha = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${recapchav3_secret}&response=${recapchaToken}`,
    );
    const score = await isSecsusRechapcha.json();
    if (score.score < LimitScore || score.success == false) {
      console.log(recapchav3_secret, score);
      return false;
    }
    return true;
  }
  return false;
};
