import { Composition } from 'remotion';
import { GameIntro } from './compositions/GameIntro';
import { GameplayHighlight } from './compositions/GameplayHighlight';
import { KillMontage } from './compositions/KillMontage';
import { PromoVideo } from './compositions/PromoVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PromoVideo"
        component={PromoVideo}
        durationInFrames={3600}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="GameplayHighlight"
        component={GameplayHighlight}
        durationInFrames={1800}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{
          title: 'POOKIE SUMO ROYALE',
          subtitle: 'Push. Survive. Win.',
          ballColor: '#ff66cc',
          playerName: 'Champion',
        }}
      />
      <Composition
        id="KillMontage"
        component={KillMontage}
        durationInFrames={900}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{
          kills: 4,
          playerName: 'Champion',
          ballColor: '#ff66cc',
        }}
      />
      <Composition
        id="GameIntro"
        component={GameIntro}
        durationInFrames={300}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{
          tagline: 'Push. Survive. Win.',
        }}
      />
    </>
  );
};
