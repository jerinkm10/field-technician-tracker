import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateInvoiceInputFieldDto {
  @IsString()
  section!: string;

  @IsString()
  fieldKey!: string;

  @IsString()
  label!: string;

  @IsString()
  inputType!: string;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
