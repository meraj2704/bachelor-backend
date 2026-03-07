import { PartialType } from '@nestjs/swagger';
import { CreateBazarDto } from './create-bazar.dto.js';

export class UpdateBazarDto extends PartialType(CreateBazarDto) {}
