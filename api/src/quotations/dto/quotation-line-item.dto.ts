import { IsNumber, IsString } from 'class-validator';

export class QuotationLineItemDto {
  @IsString()
  productServiceName!: string;

  @IsString()
  description!: string;

  @IsString()
  hsnSac!: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  unitPrice!: number;

  @IsNumber()
  cgstAmount!: number;

  @IsNumber()
  cgstPercentage!: number;

  @IsNumber()
  sgstAmount!: number;

  @IsNumber()
  sgstPercentage!: number;

  @IsNumber()
  lineAmount!: number;
}
