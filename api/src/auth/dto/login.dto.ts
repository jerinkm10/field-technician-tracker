import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class LoginDto {
  @ValidateIf((payload: LoginDto) => !payload.email)
  @IsString()
  @IsNotEmpty()
  username?: string;

  @ValidateIf((payload: LoginDto) => !payload.username)
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
