import csrfToken from "../models/csrftoken.ts"
const takos = {
    checkCsrfToken: async (token: string) => {
        if(typeof token !== "string") {
            return false
        }
        const csrftoken = await csrfToken.findOne({ token: token })
        if (csrftoken === null) {
            return false
        }
        return true
    },
    splitUserName :(userName: string) => {
        const split = userName.split("@")
        return {
          userName: split[0],
          domain: split[1],
        }
      }
}
export default takos