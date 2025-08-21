import { simpleHandoffScenario } from './simpleHandoff';
import { customerServiceRetailScenario } from './customerServiceRetail';
import { chatSupervisorScenario } from './chatSupervisor';
import { mathLearnScenario } from './mathLearn';

/**
 * Map of scenario key -> array of RealtimeAgent objects
 * @type {Record<string, import('@openai/agents/realtime').RealtimeAgent[]>}
 */
export const allAgentSets = {
  simpleHandoff: simpleHandoffScenario,
  customerServiceRetail: customerServiceRetailScenario,
  chatSupervisor: chatSupervisorScenario,
  mathLearn: mathLearnScenario,
};

export const defaultAgentSetKey = 'mathLearn';