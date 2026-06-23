import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateInvoiceInputFieldDto {
  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsString()
  fieldKey?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  inputType?: string;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
