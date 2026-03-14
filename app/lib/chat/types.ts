export type Message = {
  role: string;
  content: string;
  time?: string;
  imageUrl?: string;
  gifUrl?: string;
  stickerName?: string;
  gifCaption?: string;
  isBlock?: boolean;
  isLTInvite?: boolean;
  ltInviteVideoId?: string;
  ltInviteTitle?: string;
  ltInviteChannel?: string;
  ltInviteAccepted?: boolean;
};

export type CharacterOption = {
  key: string;
  name: string;
  avatar: string;
};

export type ChatCharacter = {
  name: string;
  color: string;
  avatar: string;
  title: string;
  annoyanceThreshold: number;
  annoyanceBlockMessage: string;
};