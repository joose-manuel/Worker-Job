import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profilesRepository: Repository<Profile>,
  ) {}

  async get(userId: number): Promise<Profile | null> {
    return this.profilesRepository.findOneBy({ userId });
  }

  async upsert(userId: number, dto: UpdateProfileDto): Promise<Profile> {
    const existing = await this.get(userId);
    if (existing) {
      Object.assign(existing, dto);
      return this.profilesRepository.save(existing);
    }
    const profile = this.profilesRepository.create({ ...dto, userId });
    return this.profilesRepository.save(profile);
  }

  async setCv(userId: number, filePath: string, originalName: string): Promise<Profile> {
    const profile = (await this.get(userId)) ?? this.profilesRepository.create({ userId });
    profile.cvFilePath = filePath;
    profile.cvOriginalName = originalName;
    return this.profilesRepository.save(profile);
  }
}
