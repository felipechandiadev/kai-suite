import { Module, forwardRef } from '@nestjs/common';
import { DiningModule } from '@modules/dining/dining.module';
import { LiraVoiceService } from './application/lira-voice.service';
import { LiraVoiceController } from './presentation/lira-voice.controller';

@Module({
  imports: [forwardRef(() => DiningModule)],
  controllers: [LiraVoiceController],
  providers: [LiraVoiceService],
  exports: [LiraVoiceService],
})
export class LiraModule {}
