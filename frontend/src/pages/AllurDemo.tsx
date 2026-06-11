import { useState, useRef, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import logo from "@/assets/logo.svg";

const BRAND = "#ff2e1f";

interface Dataset {
  id: string;
  question: string;
  keywords: string[];
  chartTitle: string;
  unit: string;
  data: { name: string; value: number }[];
  answer: string;
}

// Демо-данные (моковые) по продажам автомобилей Allur — всё на русском.
const DATASETS: Dataset[] = [
  {
    id: "models",
    question: "Какие модели продавались лучше всего в 2024 году?",
    keywords: ["модел", "лучше", "топ продаж", "популярн", "хит"],
    chartTitle: "Продажи по моделям, 2024 (шт.)",
    unit: "шт.",
    data: [
      { name: "Chevrolet Onix", value: 4820 },
      { name: "Chevrolet Cobalt", value: 3950 },
      { name: "JAC JS4", value: 2780 },
      { name: "Kia Sportage", value: 2310 },
      { name: "Chery Tiggo 7", value: 1980 },
    ],
    answer:
      "В 2024 году лидером продаж стала модель Chevrolet Onix — 4 820 автомобилей. " +
      "В топ-5 также вошли Chevrolet Cobalt (3 950) и JAC JS4 (2 780). Всего по пяти моделям продано 15 840 машин.",
  },
  {
    id: "revenue",
    question: "Как менялась выручка по месяцам?",
    keywords: ["выручк", "доход", "месяц", "динамик", "оборот"],
    chartTitle: "Выручка по месяцам, 2024 (млрд ₸)",
    unit: "млрд ₸",
    data: [
      { name: "Янв", value: 8.2 },
      { name: "Фев", value: 9.1 },
      { name: "Мар", value: 11.4 },
      { name: "Апр", value: 10.8 },
      { name: "Май", value: 12.6 },
      { name: "Июн", value: 13.9 },
      { name: "Июл", value: 12.1 },
      { name: "Авг", value: 14.7 },
      { name: "Сен", value: 15.3 },
      { name: "Окт", value: 16.8 },
      { name: "Ноя", value: 15.9 },
      { name: "Дек", value: 18.4 },
    ],
    answer:
      "Выручка росла в течение года и достигла пика в декабре — 18,4 млрд ₸. " +
      "Сильнее всего продажи выросли в IV квартале на фоне сезонного спроса. Годовой оборот составил около 159,2 млрд ₸.",
  },
  {
    id: "cities",
    question: "В каких городах больше всего продаж?",
    keywords: ["город", "регион", "област", "география", "где"],
    chartTitle: "Продажи по городам, 2024 (шт.)",
    unit: "шт.",
    data: [
      { name: "Алматы", value: 5230 },
      { name: "Астана", value: 4470 },
      { name: "Шымкент", value: 2890 },
      { name: "Караганда", value: 1740 },
      { name: "Актобе", value: 1320 },
      { name: "Атырау", value: 1080 },
    ],
    answer:
      "Больше всего автомобилей продано в Алматы — 5 230 шт., далее Астана (4 470) и Шымкент (2 890). " +
      "На три крупнейших города приходится около 60% всех продаж.",
  },
  {
    id: "share",
    question: "Какая доля рынка у брендов?",
    keywords: ["доля", "рынок", "бренд", "марк", "конкурент"],
    chartTitle: "Доля рынка по брендам, 2024 (%)",
    unit: "%",
    data: [
      { name: "Chevrolet", value: 28 },
      { name: "Kia", value: 21 },
      { name: "Hyundai", value: 18 },
      { name: "JAC", value: 14 },
      { name: "Chery", value: 11 },
      { name: "Прочие", value: 8 },
    ],
    answer:
      "Наибольшую долю рынка занимает Chevrolet — 28%, за ним идут Kia (21%) и Hyundai (18%). " +
      "Китайские бренды JAC и Chery вместе занимают 25% и продолжают укреплять позиции.",
  },
  {
    id: "avgcheck",
    question: "Какой средний чек по моделям?",
    keywords: ["средний чек", "цена", "стоимост", "чек", "дорог"],
    chartTitle: "Средний чек по моделям (млн ₸)",
    unit: "млн ₸",
    data: [
      { name: "Kia Sportage", value: 14.9 },
      { name: "Chery Tiggo 7", value: 12.3 },
      { name: "JAC JS4", value: 10.1 },
      { name: "Chevrolet Onix", value: 8.7 },
      { name: "Chevrolet Cobalt", value: 7.4 },
    ],
    answer:
      "Самый высокий средний чек у Kia Sportage — 14,9 млн ₸, самый доступный вариант — Chevrolet Cobalt (7,4 млн ₸). " +
      "Премиальные кроссоверы обеспечивают большую маржу при меньшем объёме продаж.",
  },
  {
    id: "testdrive",
    question: "Сколько тест-драйвов провели по моделям?",
    keywords: ["тест-драйв", "тест драйв", "тестдрайв", "записал"],
    chartTitle: "Количество тест-драйвов по моделям, 2024 (шт.)",
    unit: "шт.",
    data: [
      { name: "Chevrolet Onix", value: 1840 },
      { name: "Kia Sportage", value: 1620 },
      { name: "JAC JS4", value: 1290 },
      { name: "Chery Tiggo 7", value: 1110 },
      { name: "Chevrolet Cobalt", value: 970 },
    ],
    answer:
      "Больше всего тест-драйвов провели на Chevrolet Onix — 1 840, что коррелирует с лидерством модели в продажах. " +
      "Конверсия из тест-драйва в покупку по компании составила около 38%.",
  },
];

interface Message {
  role: "user" | "assistant";
  text: string;
}

const numberFmt = new Intl.NumberFormat("ru-RU");

function findDataset(query: string): Dataset {
  const q = query.toLowerCase();
  const match = DATASETS.find((d) =>
    d.keywords.some((k) => q.includes(k)) || q.includes(d.question.toLowerCase())
  );
  return match ?? DATASETS[0];
}

const AllurDemo = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text:
        "Здравствуйте! Я аналитический помощник Allur. " +
        "Задайте вопрос о продажах автомобилей или выберите один из предложенных ниже.",
    },
  ]);
  const [activeDataset, setActiveDataset] = useState<Dataset>(DATASETS[0]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ask = (text: string) => {
    const query = text.trim();
    if (!query) return;
    const dataset = findDataset(query);
    setActiveDataset(dataset);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: query },
      { role: "assistant", text: dataset.answer },
    ]);
    setInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-red-50 to-orange-100">
      {/* Шапка */}
      <header className="bg-white/80 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <img src={logo} alt="Логотип Allur" className="w-5 h-5 brightness-0 invert" />
          </div>
          <div>
            <span className="font-bold text-foreground text-lg block leading-tight">
              Allur Аналитика
            </span>
            <span className="text-xs text-muted-foreground">
              Демо · продажи автомобилей
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Верх: график */}
        <Card className="p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">
            {activeDataset.chartTitle}
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeDataset.data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={activeDataset.data.length > 6 ? 0 : -12}
                  textAnchor="middle"
                  height={48}
                />
                <YAxis tick={{ fontSize: 12 }} width={48} />
                <Tooltip
                  formatter={(value: number) => [
                    `${numberFmt.format(value)} ${activeDataset.unit}`,
                    "Значение",
                  ]}
                  cursor={{ fill: "rgba(255,46,31,0.06)" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {activeDataset.data.map((_, index) => (
                    <Cell key={index} fill={BRAND} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Низ: чат */}
        <Card className="flex flex-col flex-1 min-h-[360px] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Подсказки */}
          <div className="px-5 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Предлагаемые вопросы:</p>
            <div className="flex flex-wrap gap-2">
              {DATASETS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => ask(d.question)}
                  className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {d.question}
                </button>
              ))}
            </div>
          </div>

          {/* Ввод */}
          <form onSubmit={handleSubmit} className="p-4 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Спросите о продажах, моделях, городах…"
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default AllurDemo;
