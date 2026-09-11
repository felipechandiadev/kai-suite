import {
  isSamiGreeting,
  nextConversationTitle,
  conversationTitleFromUserText,
} from '../../application/sami-greeting';

describe('sami-greeting', () => {
  it('detects short greetings', () => {
    expect(isSamiGreeting('Hola cómo estás')).toBe(true);
    expect(isSamiGreeting('hola')).toBe(true);
    expect(isSamiGreeting('buenas tardes')).toBe(true);
  });

  it('does not treat a business question as greeting', () => {
    expect(isSamiGreeting('ventas del lunes')).toBe(false);
    expect(conversationTitleFromUserText('Hola cómo estás')).toBeNull();
    expect(conversationTitleFromUserText('ventas del lunes')).toBe('ventas del lunes');
  });

  it('skips greeting for title and replaces greeting titles', () => {
    expect(nextConversationTitle('Nueva conversación', 'Hola cómo estás')).toBeNull();
    expect(nextConversationTitle('Hola cómo estás', 'ventas del lunes')).toBe(
      'ventas del lunes',
    );
    expect(nextConversationTitle('ventas del lunes', 'otra pregunta')).toBeNull();
  });
});
