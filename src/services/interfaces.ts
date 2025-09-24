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
  isUserInCouple(coupleId: string, userId: string): Promise<boolean>;
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
  createMood(
    coupleId: string,
    userId: string,
    moodData: {
      mood: string;
      note?: string;
    }
  ): Promise<any>;

  getLatestMoodForUser(
    coupleId: string,
    targetUserId: string,
    requestUserId: string
  ): Promise<any>;

  getMoodHistory(
    coupleId: string,
    userId: string,
    options?: {
      targetUserId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    moods: any[];
    total: number;
  }>;

  getMoodById(moodId: string, userId: string): Promise<any>;

  updateMood(
    moodId: string,
    userId: string,
    updateData: {
      mood?: string;
      note?: string;
    }
  ): Promise<any>;

  deleteMood(moodId: string, userId: string): Promise<boolean>;

  getMoodStats(
    coupleId: string,
    userId: string,
    options?: {
      targetUserId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any>;

  getMoodTrends(
    coupleId: string,
    userId: string,
    options: {
      targetUserId?: string;
      period: "week" | "month" | "year";
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any>;

  getCurrentMoodStatus(coupleId: string, userId: string): Promise<any>;
}

// Note service interface
export interface INoteService {
  createNote(noteData: {
    coupleId: string;
    authorId: string;
    content: string;
    tags?: string[];
    isPrivate?: boolean;
  }): Promise<any>;

  getNotesByCouple(
    coupleId: string,
    userId: string,
    page?: number,
    limit?: number,
    tags?: string[],
    searchTerm?: string
  ): Promise<any>;

  getNoteById(noteId: string, userId: string): Promise<any>;

  updateNote(
    noteId: string,
    userId: string,
    updateData: {
      content?: string;
      tags?: string[];
      isPrivate?: boolean;
    }
  ): Promise<any>;

  deleteNote(noteId: string, userId: string): Promise<void>;

  getTagsByCouple(coupleId: string): Promise<string[]>;

  searchNotes(
    coupleId: string,
    userId: string,
    searchTerm: string,
    page?: number,
    limit?: number
  ): Promise<any>;
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

// Photo service interface
export interface IPhotoService {
  uploadPhoto(
    coupleId: string,
    uploaderId: string,
    photoData: {
      url: string;
      caption?: string;
      isFavorite?: boolean;
    }
  ): Promise<any>;

  getCouplePhotos(
    coupleId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: "createdAt" | "isFavorite";
      sortOrder?: "asc" | "desc";
    }
  ): Promise<{
    photos: any[];
    total: number;
  }>;

  getPhotoById(photoId: string, userId: string): Promise<any>;

  updatePhoto(
    photoId: string,
    userId: string,
    updateData: {
      caption?: string;
      isFavorite?: boolean;
    }
  ): Promise<any>;

  deletePhoto(photoId: string, userId: string): Promise<boolean>;

  togglePhotoFavorite(photoId: string, userId: string): Promise<any>;

  getFavoritePhotos(
    coupleId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    photos: any[];
    total: number;
  }>;

  getPhotosByUploader(
    coupleId: string,
    uploaderId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    photos: any[];
    total: number;
  }>;

  getPhotoStats(coupleId: string, userId: string): Promise<any>;

  searchPhotos(
    coupleId: string,
    userId: string,
    searchQuery: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    photos: any[];
    total: number;
  }>;
}
