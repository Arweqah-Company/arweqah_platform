import { SAMPLE_EVAL_FILE } from '../../src/modules/performance/domain/rules/fixtures/eval-file.sample';

const STAGE_NAMES = ['', 'التأسيس', 'التخصص', 'البراعة', 'القيادة التشغيلية', 'القيادة المؤسسية'];
const AT = SAMPLE_EVAL_FILE.indexOf('سلم الدرجات');

/** The sample stage written for another stage: its name and its behaviour codes. */
const stageText = (n: number): string => SAMPLE_EVAL_FILE.slice(0, AT).replace(/المرحلة 1 التأسيس/g, `المرحلة ${n} ${STAGE_NAMES[n]}`).replace(/B1\./g, `B${n}.`);

/** An evaluation file with the five stages, the grade scale and the fiscal card: the cycle can open once it is saved. */
export const FULL_EVAL_FILE = [1, 2, 3, 4, 5].map(stageText).join('\n') + '\n' + SAMPLE_EVAL_FILE.slice(AT);
