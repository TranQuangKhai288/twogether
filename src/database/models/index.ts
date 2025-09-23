// Export all database models
export { User } from "./User";
export type { IUser } from "./User";
export { Couple } from "./Couple";
export type { ICouple } from "./Couple";
export { CoupleInvitation } from "./CoupleInvitation";
export type { ICoupleInvitation } from "./CoupleInvitation";
export { Anniversary } from "./Anniversary";
export type { IAnniversary } from "./Anniversary";
export { Note } from "./Note";
export type { INote } from "./Note";
export { Photo } from "./Photo";
export type { IPhoto } from "./Photo";
export { Mood } from "./Mood";
export type { IMood } from "./Mood";
export { LocationShare } from "./LocationShare";
export type { ILocationShare } from "./LocationShare";

// Export database connection
export { dbConnection, DatabaseConnection } from "../connection";
