import { PartialType } from '@nestjs/swagger';
import { CreateFixedCostDto } from './create-fixed-cost.dto.js';

export class UpdateFixedCostDto extends PartialType(CreateFixedCostDto) {
  // Inherits all validation but makes them optional for PATCH requests
}