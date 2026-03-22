/**
 * Готовые примеры публичных тестов для сидов (Next.js JSON DB и документация).
 * Id вопросов и вариантов — латиница и подчёркивания (для формул).
 */

import { randomUUID } from 'crypto'
import type { DbTest } from '@/lib/server/types'
import type { Formula, Question } from '@/lib/types'

const now = () => new Date().toISOString()

/** Большой пример: профориентация и условия работы */
export function buildDemoProfOrientationTest(ownerId: string): DbTest {
  const questions: Question[] = [
    {
      id: 'prof_q1',
      type: 'single',
      text: 'Какой тип задач вам даётся легче всего?',
      required: true,
      sectionTitle: 'Предпочтения',
      options: [
        { id: 'prof_o1', text: 'Придумывать новое, оформлять идеи', weight: 3 },
        { id: 'prof_o2', text: 'Собирать данные, искать закономерности', weight: 3 },
        { id: 'prof_o3', text: 'Общаться, договариваться, мотивировать', weight: 3 },
        { id: 'prof_o4', text: 'Настраивать, чинить, работать руками / с техникой', weight: 3 },
      ],
    },
    {
      id: 'prof_q2',
      type: 'multiple',
      text: 'Отметьте качества, которые про вас чаще говорят окружающие',
      required: true,
      sectionTitle: 'Предпочтения',
      options: [
        { id: 'prof_o5', text: 'Креативность', weight: 1 },
        { id: 'prof_o6', text: 'Ответственность', weight: 1 },
        { id: 'prof_o7', text: 'Эмпатия', weight: 1 },
        { id: 'prof_o8', text: 'Системность', weight: 1 },
        { id: 'prof_o9', text: 'Смелость решений', weight: 1 },
        { id: 'prof_o10', text: 'Терпение к деталям', weight: 1 },
      ],
    },
    {
      id: 'prof_q3',
      type: 'scale',
      text: 'Насколько вам комфортно учиться новым инструментам (программы, оборудование)?',
      required: true,
      sectionTitle: 'Предпочтения',
      options: [],
      scaleMin: 1,
      scaleMax: 7,
      scaleMinLabel: 'Сложно',
      scaleMaxLabel: 'Легко',
    },
    {
      id: 'prof_q4',
      type: 'single',
      text: 'Какой формат работы вам ближе?',
      required: true,
      sectionTitle: 'Условия',
      options: [
        { id: 'prof_o11', text: 'Стабильный офис с коллегами', weight: 1 },
        { id: 'prof_o12', text: 'Гибрид: часть времени дома', weight: 2 },
        { id: 'prof_o13', text: 'Полностью удалённо', weight: 3 },
        { id: 'prof_o14', text: 'Проекты и командировки', weight: 2 },
      ],
    },
    {
      id: 'prof_q5',
      type: 'scale',
      text: 'Насколько важен для вас предсказуемый график (фиксированные часы)?',
      required: true,
      sectionTitle: 'Условия',
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: 'Не важен',
      scaleMaxLabel: 'Очень важен',
    },
    {
      id: 'prof_q6',
      type: 'number',
      text: 'Сколько часов в неделю вы готовы уделять работе в комфортном режиме? (приблизительно)',
      required: false,
      sectionTitle: 'Условия',
      options: [],
      numberMin: 10,
      numberMax: 60,
    },
    {
      id: 'prof_q7',
      type: 'multiple',
      text: 'Что для вас важнее в карьере? (несколько вариантов)',
      required: true,
      sectionTitle: 'Ценности',
      options: [
        { id: 'prof_o15', text: 'Высокий доход', weight: 1 },
        { id: 'prof_o16', text: 'Смысл и польза для людей', weight: 1 },
        { id: 'prof_o17', text: 'Свобода и автономия', weight: 1 },
        { id: 'prof_o18', text: 'Признание и рост', weight: 1 },
        { id: 'prof_o19', text: 'Безопасность и стабильность', weight: 1 },
      ],
    },
    {
      id: 'prof_q8',
      type: 'single',
      text: 'Через 5 лет вы скорее хотели бы…',
      required: true,
      sectionTitle: 'Ценности',
      options: [
        { id: 'prof_o20', text: 'Углубиться в одну узкую специализацию', weight: 1 },
        { id: 'prof_o21', text: 'Управлять людьми или проектами', weight: 2 },
        { id: 'prof_o22', text: 'Пробовать разные роли и направления', weight: 3 },
        { id: 'prof_o23', text: 'Иметь свой бизнес или консалтинг', weight: 2 },
      ],
    },
    {
      id: 'prof_q9',
      type: 'scale',
      text: 'Готовность проходить обучение вне рабочего времени ради карьеры',
      required: true,
      sectionTitle: 'Развитие',
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: 'Низкая',
      scaleMaxLabel: 'Высокая',
    },
    {
      id: 'prof_q10',
      type: 'number',
      text: 'Сколько лет вы планируете развиваться в выбранной сфере?',
      required: false,
      sectionTitle: 'Развитие',
      options: [],
      numberMin: 0,
      numberMax: 40,
    },
    {
      id: 'prof_q11',
      type: 'single',
      text: 'В команде вы чаще…',
      required: true,
      sectionTitle: 'Стиль работы',
      options: [
        { id: 'prof_o24', text: 'Беру инициативу и веду за собой', weight: 2 },
        { id: 'prof_o25', text: 'Поддерживаю и согласовываю', weight: 1 },
        { id: 'prof_o26', text: 'Работаю автономно в рамках задачи', weight: 2 },
        { id: 'prof_o27', text: 'Предлагаю нестандартные идеи', weight: 2 },
      ],
    },
    {
      id: 'prof_q12',
      type: 'open',
      text: 'Что вас сильнее всего мотивирует в работе? (необязательно)',
      required: false,
      sectionTitle: 'Стиль работы',
      options: [],
    },
    {
      id: 'prof_q13',
      type: 'open',
      text: 'Чего вы бы не хотели в своей будущей работе? (необязательно)',
      required: false,
      sectionTitle: 'Стиль работы',
      options: [],
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'prof_f1',
      name: 'Человек-искусство',
      expression: 'prof_q1_prof_o1 * 12 + prof_q2_prof_o5 * 8 + prof_q11_prof_o27 * 10',
      description: 'Склонность к творческим и проектным ролям, дизайну и самовыражению',
    },
    {
      id: 'prof_f2',
      name: 'Человек-знак',
      expression: 'prof_q1_prof_o2 * 12 + prof_q2_prof_o8 * 10 + prof_q3_score * 4',
      description: 'Интерес к данным, знаковым системам, точности и правилам',
    },
    {
      id: 'prof_f3',
      name: 'Человек-человек',
      expression: 'prof_q1_prof_o3 * 12 + prof_q2_prof_o7 * 10 + prof_q11_prof_o24 * 6',
      description: 'Роли с общением, координацией, заботой о людях',
    },
    {
      id: 'prof_f4',
      name: 'Человек-техника',
      expression: 'prof_q1_prof_o4 * 14 + prof_q9_score * 8',
      description: 'Склонность к технике, инженерии, настройке и прикладным задачам',
    },
    {
      id: 'prof_f5',
      name: 'Человек-природа',
      expression: 'prof_q4_prof_o13 * 15 + prof_q7_prof_o16 * 12 + prof_q8_prof_o22 * 10',
      description: 'Интерес к смыслу, пользе для людей и природы, гибким форматам работы',
    },
  ]

  const t = now()
  return {
    id: randomUUID(),
    ownerId,
    title: 'Определение типа профессии (пример)',
    description:
      'Разнообразный демо-тест: одиночный и множественный выбор, шкалы, числа и открытые ответы. Подходит для знакомства с платформой.',
    instruction:
      'Отвечайте так, как есть сейчас — нет «правильных» ответов. Можно вернуться к предыдущему вопросу. Ответы сохраняются автоматически.',
    questions,
    formulas,
    requiresPersonalData: true,
    clientReportTemplate: '',
    professionalReportTemplate: '',
    createdAt: t,
    updatedAt: t,
  }
}

/** Короткий пример: комфорт в коммуникации и нагрузке */
export function buildDemoTeamStyleTest(ownerId: string): DbTest {
  const questions: Question[] = [
    {
      id: 'team_q1',
      type: 'scale',
      text: 'Насколько вам комфортно выступать перед аудиторией (даже небольшой)?',
      required: true,
      sectionTitle: 'Коммуникация',
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: 'Очень некомфортно',
      scaleMaxLabel: 'Комфортно',
    },
    {
      id: 'team_q2',
      type: 'single',
      text: 'Какой канал общения вы предпочитаете для важных вопросов?',
      required: true,
      sectionTitle: 'Коммуникация',
      options: [
        { id: 'team_o1', text: 'Живой разговор / звонок', weight: 2 },
        { id: 'team_o2', text: 'Текст в мессенджере', weight: 1 },
        { id: 'team_o3', text: 'Письмо / документ', weight: 1 },
        { id: 'team_o4', text: 'Видео встреча', weight: 2 },
      ],
    },
    {
      id: 'team_q3',
      type: 'multiple',
      text: 'Какие командные задачи вам обычно заходят лучше?',
      required: true,
      sectionTitle: 'Коммуникация',
      options: [
        { id: 'team_o5', text: 'Мозговые штурмы', weight: 1 },
        { id: 'team_o6', text: 'Распределение ролей и сроков', weight: 1 },
        { id: 'team_o7', text: 'Поддержка коллег в стрессе', weight: 1 },
        { id: 'team_o8', text: 'Контроль качества результата', weight: 1 },
      ],
    },
    {
      id: 'team_q4',
      type: 'scale',
      text: 'Как вы переносите жёсткие дедлайны?',
      required: true,
      sectionTitle: 'Нагрузка',
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: 'Тяжело',
      scaleMaxLabel: 'Нормально',
    },
    {
      id: 'team_q5',
      type: 'number',
      text: 'Сколько параллельных задач вы обычно держите в голове без потери качества?',
      required: false,
      sectionTitle: 'Нагрузка',
      options: [],
      numberMin: 1,
      numberMax: 15,
    },
    {
      id: 'team_q6',
      type: 'single',
      text: 'Обратная связь по работе вы предпочитаете…',
      required: true,
      sectionTitle: 'Обратная связь',
      options: [
        { id: 'team_o9', text: 'Частую и короткую', weight: 1 },
        { id: 'team_o10', text: 'Редкую, но развёрнутую', weight: 1 },
        { id: 'team_o11', text: 'В письменном виде', weight: 1 },
        { id: 'team_o12', text: 'Ненавязчивую, по запросу', weight: 1 },
      ],
    },
    {
      id: 'team_q7',
      type: 'open',
      text: 'Что помогает вам сохранять баланс при высокой нагрузке? (необязательно)',
      required: false,
      sectionTitle: 'Благополучие',
      options: [],
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'team_f1',
      name: '«Публичность»',
      expression: 'team_q1_score * 15 + team_q2_team_o4 * 12',
      description: 'Комфорт видимых и синхронных форматов',
    },
    {
      id: 'team_f2',
      name: 'Структура в команде',
      expression: 'team_q3_team_o6 * 10 + team_q3_team_o8 * 10 + team_q4_score * 8',
      description: 'Организация, контроль, устойчивость к срокам',
    },
    {
      id: 'team_f3',
      name: 'Многозадачность',
      expression: 'team_q5_score * 6 + team_q4_score * 10',
      description: 'Оценка по числу задач и переносимости дедлайнов',
    },
  ]

  const t = now()
  return {
    id: randomUUID(),
    ownerId,
    title: 'Стиль работы и коммуникации (пример)',
    description:
      'Короткий пример для тех, кто хочет быстро посмотреть шкалы, числа и открытый вопрос в другом контексте.',
    instruction: 'Займёт около 3–5 минут. Все обязательные вопросы нужно заполнить перед завершением.',
    questions,
    formulas,
    requiresPersonalData: true,
    clientReportTemplate: '',
    professionalReportTemplate: '',
    createdAt: t,
    updatedAt: t,
  }
}

/** Тест «Оценка мотивации к обучению» — 5 вопросов */
export function buildDemoMotivationTest(ownerId: string): DbTest {
  const questions: Question[] = [
    {
      id: 'mot_q1',
      type: 'single',
      text: 'Как часто вы самостоятельно изучаете новое вне работы или учёбы?',
      required: true,
      sectionTitle: 'Самостоятельность',
      options: [
        { id: 'mot_o1', text: 'Почти никогда', weight: 1 },
        { id: 'mot_o2', text: 'Редко, по необходимости', weight: 2 },
        { id: 'mot_o3', text: 'Периодически, несколько раз в месяц', weight: 3 },
        { id: 'mot_o4', text: 'Регулярно, еженедельно', weight: 4 },
        { id: 'mot_o5', text: 'Постоянно, это часть моей жизни', weight: 5 },
      ],
    },
    {
      id: 'mot_q2',
      type: 'scale',
      text: 'Насколько вам интересно обучение ради самого процесса познания?',
      required: true,
      sectionTitle: 'Интерес',
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: 'Совсем не интересно',
      scaleMaxLabel: 'Очень интересно',
    },
    {
      id: 'mot_q3',
      type: 'multiple',
      text: 'Что вас в первую очередь мотивирует учиться? (выберите до 3 вариантов)',
      required: true,
      sectionTitle: 'Мотивация',
      options: [
        { id: 'mot_o6', text: 'Карьерный рост и зарплата', weight: 1 },
        { id: 'mot_o7', text: 'Любопытство и интерес к теме', weight: 2 },
        { id: 'mot_o8', text: 'Признание окружающих', weight: 1 },
        { id: 'mot_o9', text: 'Самосовершенствование', weight: 2 },
        { id: 'mot_o10', text: 'Необходимость по работе', weight: 1 },
      ],
    },
    {
      id: 'mot_q4',
      type: 'scale',
      text: 'Как вы оцениваете свою дисциплину в обучении (регулярность, завершение курсов)?',
      required: true,
      sectionTitle: 'Дисциплина',
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: 'Слабая',
      scaleMaxLabel: 'Высокая',
    },
    {
      id: 'mot_q5',
      type: 'single',
      text: 'Как вы относитесь к ошибкам в процессе обучения?',
      required: true,
      sectionTitle: 'Отношение к ошибкам',
      options: [
        { id: 'mot_o11', text: 'Расстраивают, снижают интерес', weight: 1 },
        { id: 'mot_o12', text: 'Принимаю как неизбежность', weight: 2 },
        { id: 'mot_o13', text: 'Воспринимаю как обратную связь для роста', weight: 4 },
        { id: 'mot_o14', text: 'Стимулируют искать новые подходы', weight: 5 },
      ],
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'mot_f1',
      name: 'Внутренняя мотивация',
      expression:
        'mot_q1_mot_o3 * 15 + mot_q1_mot_o4 * 20 + mot_q1_mot_o5 * 25 + mot_q2_score * 12 + mot_q3_mot_o7 * 10 + mot_q3_mot_o9 * 10',
      description: 'Склонность к обучению ради интереса и саморазвития',
    },
    {
      id: 'mot_f2',
      name: 'Внешняя мотивация',
      expression: 'mot_q3_mot_o6 * 15 + mot_q3_mot_o8 * 12 + mot_q3_mot_o10 * 15',
      description: 'Ориентация на карьеру, признание и внешние стимулы',
    },
    {
      id: 'mot_f3',
      name: 'Устойчивость к трудностям',
      expression: 'mot_q4_score * 15 + mot_q5_mot_o13 * 20 + mot_q5_mot_o14 * 25',
      description: 'Дисциплина и конструктивное отношение к ошибкам',
    },
  ]

  const clientTemplate = `ОТЧЁТ ДЛЯ КЛИЕНТА
Тест: {{testTitle}}

Уважаемый(ая) {{clientName}}!

Благодарим за прохождение теста «Оценка мотивации к обучению». Ниже представлены ваши результаты по трём шкалам (от 0 до 100%: чем выше балл, тем выраженнее характеристика).

РЕЗУЛЬТАТЫ:
{{metrics_lines}}

ИНТЕРПРЕТАЦИЯ:
{{interpretation}}

Рекомендуем обсудить результаты с психологом или профконсультантом для углублённой работы.
Дата формирования: автоматически при завершении теста.`

  const profTemplate = `ПРОФЕССИОНАЛЬНЫЙ ОТЧЁТ
Тест: {{testTitle}}

Данные клиента: {{clientName}}
{{clientEmail}}
Возраст: {{clientAge}}

МЕТРИКИ (нормализовано 0–100):
{{metrics_lines}}

ИНТЕРПРЕТАЦИЯ:
{{interpretation}}

--- Рекомендации для психолога ---
• Сопоставьте ведущую шкалу с запросом клиента
• При низкой «Устойчивости к трудностям» — проработать стратегии преодоления
• При доминировании внешней мотивации — исследовать внутренние ресурсы
• Учитывайте ответы на открытые вопросы при индивидуальной консультации`

  const t = now()
  return {
    id: randomUUID(),
    ownerId,
    title: 'Оценка мотивации к обучению',
    description:
      'Краткая методика из 5 вопросов для оценки внутренней и внешней мотивации к обучению, дисциплины и отношения к ошибкам.',
    instruction:
      'Отвечайте искренне — нет правильных или неправильных ответов. Вопросы займут около 3 минут.',
    questions,
    formulas,
    requiresPersonalData: true,
    clientReportTemplate: clientTemplate,
    professionalReportTemplate: profTemplate,
    showClientReport: true,
    createdAt: t,
    updatedAt: t,
  }
}

export const DEMO_LINK_TOKENS = {
  profPrimary: 'demo',
  profAlt: 'demo-proforientation',
  team: 'demo-team',
  motivation: 'demo-motivation',
} as const
