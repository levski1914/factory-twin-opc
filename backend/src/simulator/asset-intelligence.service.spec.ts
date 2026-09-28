import { Test, TestingModule } from '@nestjs/testing';
import { AssetIntelligenceService } from './asset-intelligence.service';

describe('AssetIntelligenceService', () => {
  let service: AssetIntelligenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssetIntelligenceService],
    }).compile();

    service = module.get<AssetIntelligenceService>(AssetIntelligenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
