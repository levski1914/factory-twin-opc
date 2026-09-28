import { Test, TestingModule } from '@nestjs/testing';
import { TagMappingService } from './tag-mapping.service';

describe('TagMappingService', () => {
  let service: TagMappingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TagMappingService],
    }).compile();

    service = module.get<TagMappingService>(TagMappingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
