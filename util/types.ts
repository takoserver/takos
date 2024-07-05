interface serverRequest {
    host: string;
    body: string;
}
interface profileRequest {
    userName?: string;
    userId?: string;
    friendName?: string;
    friendId?: string;
}
interface profileResonse {
    userName: string;
    userId: string;
    nickName: string;
}
interface Profile {
    userName: string;
    userId: string;
    nickName: string;
    age?: number;
}