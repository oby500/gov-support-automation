'use client';

/**
 * 빠른 질문 컴포넌트
 *
 * 자주 묻는 질문을 버튼으로 표시
 */

interface QuickQuestionsProps {
  onQuestionClick: (question: string) => void;
}

const quickQuestions = [
  '가격이 얼마인가요?',
  '수정권이 뭐예요?',
  '어떤 공고를 지원하나요?',
  '여러 공고에 사용할 수 있나요?',
];

export function QuickQuestions({ onQuestionClick }: QuickQuestionsProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 font-medium">💡 자주 묻는 질문</p>
      <div className="flex flex-col gap-2">
        {quickQuestions.map((question, index) => (
          <button
            key={index}
            onClick={() => onQuestionClick(question)}
            className="text-left px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm text-gray-700"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
