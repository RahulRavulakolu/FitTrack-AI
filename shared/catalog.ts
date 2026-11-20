import media from './exercise-media.json';
export type Exercise = {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  instructions: string;
  mediaSlug: string;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  attribution?: string;
  sourceUrl?: string;
};
const entries = [
  [
    'bench-press',
    'Barbell bench press',
    'Chest',
    'gym',
    'Plant your feet and keep your shoulder blades set. Lower the bar to your mid-chest with control, then press up without bouncing. Use a spotter or safety bars.',
    'barbell-bench-press',
  ],
  [
    'incline-press',
    'Incline dumbbell press',
    'Chest',
    'dumbbells',
    'Set a low incline. Keep wrists stacked over elbows and press the dumbbells up, then lower slowly through a comfortable range.',
    'incline-dumbbell-bench-press',
  ],
  [
    'push-up',
    'Push-up',
    'Chest',
    'bodyweight',
    'Brace your core in a straight line. Lower your chest between your hands, then press away from the floor. Use an incline if needed.',
    'push-up',
  ],
  [
    'lat-pulldown',
    'Lat pulldown',
    'Back',
    'gym',
    'Sit tall with thighs secured. Pull the bar toward your upper chest by driving your elbows down. Return slowly without swinging.',
    'lat-pull-down',
  ],
  [
    'db-row',
    'One-arm dumbbell row',
    'Back',
    'dumbbells',
    'Support one hand on a bench, keep your back neutral and row toward your hip. Avoid twisting your torso.',
    'one-arm-dumbbell-row',
  ],
  [
    'prone-raise',
    'Prone Y raise',
    'Back',
    'bodyweight',
    'Lie face down with arms in a Y. Gently raise your arms with thumbs upward, keeping your neck neutral. Pause and lower slowly.',
    'floor-prone-cobra',
  ],
  [
    'shoulder-press',
    'Dumbbell shoulder press',
    'Shoulders',
    'dumbbells',
    'Brace your trunk and press overhead within a pain-free range. Keep your ribs down and lower the weights slowly.',
    'seated-dumbbell-press',
  ],
  [
    'lateral-raise',
    'Dumbbell lateral raise',
    'Shoulders',
    'dumbbells',
    'Keep a slight bend in your elbows and raise your arms to shoulder height without swinging. Lower slowly.',
    'dumbbell-lateral-raise',
  ],
  [
    'pike-pushup',
    'Pike push-up',
    'Shoulders',
    'bodyweight',
    'With hips elevated, bend your elbows to lower your head toward the floor. Press up while keeping your neck neutral.',
    'pike-push-up',
  ],
  [
    'curl',
    'Dumbbell curl',
    'Biceps',
    'dumbbells',
    'Keep elbows close to your sides. Curl without swinging your shoulders, then lower through a comfortable full range.',
    'standing-dumbbell-curl',
  ],
  [
    'self-curl',
    'Self-resisted curl',
    'Biceps',
    'bodyweight',
    'Apply gentle resistance with the opposite hand while curling. Keep your elbow still and use slow, controlled repetitions.',
    '',
  ],
  [
    'pushdown',
    'Cable triceps pushdown',
    'Triceps',
    'gym',
    'Keep upper arms still by your sides. Straighten your elbows without locking aggressively, then control the return.',
    'tricep-rope-pushdown',
  ],
  [
    'overhead-extension',
    'Overhead dumbbell extension',
    'Triceps',
    'dumbbells',
    'Hold one dumbbell overhead with both hands. Bend at the elbows and extend slowly, keeping your ribs down.',
    'two-arm-standing-dumbbell-extension',
  ],
  [
    'close-pushup',
    'Close-grip push-up',
    'Triceps',
    'bodyweight',
    'Position hands slightly narrower than shoulders. Keep elbows near your sides and your body straight as you lower and press.',
    'close-grip-push-up',
  ],
  [
    'wrist-curl',
    'Wrist curl',
    'Forearms',
    'dumbbells',
    'Support your forearms and curl a light weight using only your wrists. Move slowly without forcing the range.',
    'seated-dumbbell-wrist-curl',
  ],
  [
    'wrist-press',
    'Palm press',
    'Forearms',
    'bodyweight',
    'Press your palms together at chest height for five seconds, then release. Use gentle pressure and keep wrists comfortable.',
    '',
  ],
  [
    'squat',
    'Barbell back squat',
    'Quadriceps',
    'gym',
    'Set the bar on your upper back. Brace, sit between your hips and bend your knees in line with your toes. Stand under control. Use safety bars.',
    'squat',
  ],
  [
    'goblet-squat',
    'Goblet squat',
    'Quadriceps',
    'dumbbells',
    'Hold a dumbbell at your chest. Squat to a comfortable depth with heels planted and knees tracking over your toes.',
    'dumbbell-goblet-squat',
  ],
  [
    'body-squat',
    'Bodyweight squat',
    'Quadriceps',
    'bodyweight',
    'Stand about shoulder width apart. Brace and lower into a comfortable squat, then stand by pushing through your whole foot.',
    'bodyweight-squat',
  ],
  [
    'rdl',
    'Dumbbell Romanian deadlift',
    'Hamstrings',
    'dumbbells',
    'Soften your knees, brace and hinge at the hips. Keep weights close to your legs. Stand tall by driving your hips forward.',
    'dumbbell-romanian-deadlift',
  ],
  [
    'hinge',
    'Bodyweight good morning',
    'Hamstrings',
    'bodyweight',
    'With soft knees, push your hips back until you feel a gentle hamstring stretch. Keep your back neutral and stand tall.',
    'bodyweight-good-morning',
  ],
  [
    'hip-thrust',
    'Dumbbell hip thrust',
    'Glutes',
    'dumbbells',
    'Rest your upper back on a stable bench, place a padded dumbbell on your hips and drive upward without arching your lower back.',
    'dumbbell-hip-thrust',
  ],
  [
    'bridge',
    'Glute bridge',
    'Glutes',
    'bodyweight',
    'Lie on your back with knees bent. Brace your core, lift your hips by squeezing your glutes, pause and lower.',
    'glute-bridge',
  ],
  [
    'calf-raise',
    'Standing calf raise',
    'Calves',
    'bodyweight',
    'Stand with light support for balance. Rise onto your toes, pause, then lower slowly through a comfortable range.',
    'standing-calf-raise',
  ],
  [
    'dead-bug',
    'Dead bug',
    'Abs/Core',
    'bodyweight',
    'Lie on your back with arms up and knees bent. Keep your lower back gently grounded as you extend opposite arm and leg. Alternate sides.',
    'dead-bug',
  ],
  [
    'crunch',
    'Controlled crunch',
    'Abs/Core',
    'bodyweight',
    'Lie with knees bent. Exhale and lift your shoulder blades a little, without pulling your neck. Lower slowly.',
    'floor-crunch',
  ],
  [
    'shrug',
    'Dumbbell shrug',
    'Traps',
    'dumbbells',
    'Hold weights by your sides. Lift your shoulders straight up, pause, and lower. Avoid rolling your shoulders.',
    'dumbbell-shrugs',
  ],
  [
    'scapula',
    'Standing scapular squeeze',
    'Traps',
    'bodyweight',
    'Stand tall and draw shoulder blades gently together and down. Hold briefly and release without arching your back.',
    '',
  ],
];
export const catalog: Exercise[] = entries.map(
  ([id, name, muscle, equipment, instructions, mediaSlug]) => ({
    id,
    name,
    muscle,
    equipment,
    instructions,
    mediaSlug,
    ...(media as Record<string, any>)[id],
  }),
);
export function recommendExercises(
  groups: string[],
  equipment: string,
  duration: number,
  experience: string,
  goal: string,
) {
  const allowed = catalog.filter(
    (e) =>
      groups.includes(e.muscle) &&
      (equipment === 'gym' || e.equipment === equipment || e.equipment === 'bodyweight'),
  );
  const max = Math.max(groups.length, Math.floor(duration / 8));
  const selected: Exercise[] = [];
  for (let round = 0; round < 3; round++)
    for (const group of groups) {
      const e = allowed.filter((e) => e.muscle === group)[round];
      if (e && selected.length < max) selected.push(e);
    }
  return selected.map((e) => ({
    ...e,
    sets: experience === 'beginner' ? 2 : 3,
    reps: goal === 'bulking' ? '8–12' : '10–15',
    rest: experience === 'beginner' ? 90 : 75,
    completed: false,
    completedAt: null,
  }));
}
