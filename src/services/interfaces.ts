// Base service interface for common service patterns
export interface IBaseService<T, CreateDTO, UpdateDTO> {
  create(data: CreateDTO): Promise<T>;
  findById(id: string): Promise<T | null>;
  update(id: string, data: UpdateDTO): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

// User service interface
export interface IUserService {
  createUser(userData: {
    email: string;
    password: string;
    name: string;
    gender: "male" | "female" | "other";
    birthday?: Date;
    avatarUrl?: string;
  }): Promise<any>;

  findUserByEmail(email: string): Promise<any>;
  findUserById(id: string): Promise<any>;
  updateUser(id: string, updateData: any): Promise<any>;
  updatePreferences(id: string, preferences: any): Promise<any>;
  changePassword(
    id: string,
    currentPassword: string,
    newPassword: string
  ): Promise<any>;
  deleteUser(id: string): Promise<boolean>;
  getUsersWithPagination(options: any): Promise<any>;
  verifyUserPassword(user: any, password: string): Promise<boolean>;
}

// Couple service interface
export interface ICoupleService {
  createCouple(
    creatorId: string,
    partnerEmail: string,
    anniversaryDate: Date,
    relationshipStatus?: string
  ): Promise<any>;
  joinCoupleByInviteCode(userId: string, inviteCode: string): Promise<any>;
  getCoupleById(coupleId: string, userId: string): Promise<any>;
  updateCoupleSettings(
    coupleId: string,
    userId: string,
    settings: any
  ): Promise<any>;
  leaveCoupleAsPartner(coupleId: string, userId: string): Promise<boolean>;
  getCoupleByUserId(userId: string): Promise<any>;
  updateAnniversaryDate(
    coupleId: string,
    userId: string,
    anniversaryDate: Date
  ): Promise<any>;
  generateNewInviteCode(coupleId: string, userId: string): Promise<any>;
  getPartner(userId: string): Promise<any>;
  getCouples(options?: any): Promise<any>;
}

// Anniversary service interface
export interface IAnniversaryService {
  createAnniversary(
    coupleId: string,
    userId: string,
    anniversaryData: any
  ): Promise<any>;
  getCoupleAnniversaries(
    coupleId: string,
    userId: string,
    options?: any
  ): Promise<any>;
  getAnniversaryById(anniversaryId: string, userId: string): Promise<any>;
  updateAnniversary(
    anniversaryId: string,
    userId: string,
    updateData: any
  ): Promise<any>;
  deleteAnniversary(anniversaryId: string, userId: string): Promise<boolean>;
  getUpcomingAnniversaries(
    coupleId: string,
    userId: string,
    days?: number
  ): Promise<any>;
  getAnniversariesByDateRange(
    coupleId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any>;
  getAnniversaryStats(coupleId: string, userId: string): Promise<any>;
}

// Photo service interface
export interface IPhotoService {
  uploadPhoto(
    coupleId: string,
    uploaderId: string,
    photoData: any
  ): Promise<any>;
  getCouplePhotos(
    coupleId: string,
    userId: string,
    options?: any
  ): Promise<any>;
  updatePhoto(photoId: string, userId: string, updateData: any): Promise<any>;
  deletePhoto(photoId: string, userId: string): Promise<boolean>;
  togglePhotoFavorite(photoId: string, userId: string): Promise<any>;
}

// Mood service interface
export interface IMoodService {
  createMood(coupleId: string, userId: string, moodData: any): Promise<any>;
  getCoupleMoods(coupleId: string, userId: string, options?: any): Promise<any>;
  updateMood(moodId: string, userId: string, updateData: any): Promise<any>;
  deleteMood(moodId: string, userId: string): Promise<boolean>;
}

// Location service interface
export interface ILocationService {
  shareLocation(
    coupleId: string,
    userId: string,
    locationData: any
  ): Promise<any>;
  getCoupleLocations(
    coupleId: string,
    userId: string,
    options?: any
  ): Promise<any>;
  updateLocationShare(
    locationId: string,
    userId: string,
    updateData: any
  ): Promise<any>;
  deleteLocationShare(locationId: string, userId: string): Promise<boolean>;
}

// Couple invitation service interface
export interface ICoupleInvitationService {
  createInvitation(
    senderId: string,
    receiverEmail: string,
    message?: string
  ): Promise<any>;
  getInvitations(userId: string, type: "sent" | "received"): Promise<any>;
  respondToInvitation(
    invitationId: string,
    userId: string,
    response: "accept" | "reject"
  ): Promise<any>;
  deleteInvitation(invitationId: string, userId: string): Promise<boolean>;
}

// Note service interface
export interface INoteService {
  createNote(coupleId: string, userId: string, noteData: any): Promise<any>;
  getCoupleNotes(coupleId: string, userId: string, options?: any): Promise<any>;
  updateNote(noteId: string, userId: string, updateData: any): Promise<any>;
  deleteNote(noteId: string, userId: string): Promise<boolean>;
}
