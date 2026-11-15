import { IsEmail, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail() email: string;
  @IsString() @Length(10, 128) password: string;
}
export class RegisterDto extends LoginDto {
  @IsString() @Length(2, 100) nombre: string;
}
