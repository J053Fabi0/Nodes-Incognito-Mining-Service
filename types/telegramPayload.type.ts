import joi from "joi";

export default interface TelegramPayload {
  id: string;
  hash: string;
  auth_date: string;
  username?: string;
  last_name?: string;
  photo_url?: string;
  first_name?: string;
}

const schema = joi.object<TelegramPayload>({
  id: joi.string().required(),
  hash: joi.string().required(),
  auth_date: joi.string().required(),
  username: joi.string().optional(),
  last_name: joi.string().optional(),
  photo_url: joi.string().optional(),
  first_name: joi.string().optional(),
});

export function isTelegramPayload(arg: any): arg is TelegramPayload {
  const { error } = schema.validate(arg, { allowUnknown: true });
  return !error;
}
