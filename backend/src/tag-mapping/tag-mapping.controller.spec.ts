import { Test, TestingModule } from '@nestjs/testing';
import { TagMappingController } from './tag-mapping.controller';

describe('TagMappingController', () => {
  let controller: TagMappingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagMappingController],
    }).compile();

    controller = module.get<TagMappingController>(TagMappingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
