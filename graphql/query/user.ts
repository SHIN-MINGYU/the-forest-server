import User from "../../schemas/user";
import createToken from "../../jwt/createToken";
import createSession from "../../session/createSession";
import { contextType } from "../../type/contextType";
import authErrorCheck from "../../util/error/authError";
import createHashedPassword from "../../util/user/createHashedPassword";
import { ObjectId } from "mongoose";
import ChatRoom from "../../schemas/chat_room";

//=============================================================================

interface LoginArgs {
  username: string;
  password: string | null;
}

const Login = async (_: any, args: LoginArgs, context: any) => {
  const { username, password } = args;
  const user = await User.findOne({ username });
  const hashedValue = await createHashedPassword(password!, user?.salt);
  if (user && user.password === hashedValue!.password) {
    // create session
    const sessionId = await createSession({ username, uid: user._id });

    // create && set access && refresh Tokens
    const accessToken = createToken(
      { uid: user._id, username, sessionId },
      "5m"
    );
    const refreshToken = createToken({ sessionId }, "1y");
    context.res.cookie("refreshToken", refreshToken, {
      maxAge: 3.154e10,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production" ? true : false,
    });
    //return accessToken for remain in localStorage
    return accessToken;
  } else {
    return new Error("who are you?");
  }
};

//=============================================================================

const UserInfo = async (_: any, {}, context: contextType) => {
  // if deserializeUser's return value have authError
  // throw error
  authErrorCheck(context);
  const user = await User.findOne({ _id: context.req.user.uid });
  return user;
};

//=============================================================================

type SearchUserArgs = {
  username: string;
};

const SearchUser = async (_: any, args: SearchUserArgs) => {
  const { username } = args;
  if (await User.findOne({ username })) {
    return true;
  }
  return false;
};

//=============================================================================

const GetF4F = async (_: any, {}, context: contextType) => {
  authErrorCheck(context);
  const user = await User.findOne({ _id: context.req.user.uid });
  const F4F = user?.follower?.filter((item) => user.following?.includes(item));
  const F4FUserInfo = await User.find({ _id: { $in: F4F } });
  return F4FUserInfo;
};

//=============================================================================

const GetFollowerNotF4F = async (_: any, {}, context: contextType) => {
  authErrorCheck(context);

  const user = await User.findOne({ _id: context.req.user.uid });
  const NotF4F = user?.follower?.filter(
    (item) => !user.following?.includes(item)
  );
  const NotF4FUserInfo = await User.find({ _id: { $in: NotF4F } });
  return NotF4FUserInfo;
};

//=============================================================================

type getUserInChat = {
  chat_room: string;
};

const GetUserInChat = async (
  _: any,
  { chat_room }: getUserInChat,
  context: contextType
) => {
  authErrorCheck(context);
  console.log(chat_room);
  const uidArr = (await ChatRoom.findOne({ _id: chat_room }))?.uid;
  console.log("uidArr : ", uidArr);
  const newUidArr = uidArr?.filter((uid) => uid != context.req.user.uid);
  console.log("newUidArr : ", newUidArr);
  const users = await User.find({ _id: { $in: newUidArr } });
  return users;
};

//=============================================================================

export default {
  Login,
  UserInfo,
  SearchUser,
  GetF4F,
  GetFollowerNotF4F,
  GetUserInChat,
};
