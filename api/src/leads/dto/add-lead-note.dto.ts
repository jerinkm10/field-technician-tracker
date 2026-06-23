import { IsString } from 'class-validator';

export class AddLeadNoteDto {
  @IsString()
  note!: string;
}
