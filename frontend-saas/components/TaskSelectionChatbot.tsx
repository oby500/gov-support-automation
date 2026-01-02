/**
 * 과제 선택 챗봇
 *
 * Writing Analysis 완료 후 표시
 * - AI가 분석 결과 기반으로 과제 설명
 * - 사용자에게 어떤 과제로 작성할지 선택 받음
 * - 선택한 과제에 필요한 정보 안내
 */

'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Info, Sparkles, Target, FileText, AlertCircle } from 'lucide-react';

// 양식구조 타입 정의
interface FormFieldInfo {
  가이드: string;
  유형: '텍스트' | '테이블' | string;
  테이블컬럼?: string[];
  예시?: string[];
}

interface FormSection {
  [fieldName: string]: FormFieldInfo;
}

interface FormStructure {
  [sectionName: string]: FormSection;
}

interface Task {
  task_number: number;
  task_name: string;
  form_type?: 'simple_registration' | 'business_plan' | 'evaluation_based';  // ⭐ 과제별 양식 유형
  description: string;
  required_info: string[];
  evaluation_points: string[];
  양식구조?: FormStructure;  // ⭐ 과제별 양식구조 추가
}

interface WritingAnalysis {
  tasks?: Task[];
  common_required_info: string[];
  has_multiple_tasks: boolean;
  recommended_task?: number;
  task_input_mode?: 'select' | 'user_input' | 'none';
}

interface TaskSelectionChatbotProps {
  announcementTitle: string;
  writingAnalysis: WritingAnalysis;
  onTaskSelected: (taskNumber: number | null, requiredInfo: string[], formStructure?: FormStructure, selectedTaskName?: string) => void;  // ⭐ 양식구조 + 과제명 입력 지원
  onClose: () => void;
}

export function TaskSelectionChatbot({
  announcementTitle,
  writingAnalysis,
  onTaskSelected,
  onClose,
}: TaskSelectionChatbotProps) {
  const [currentStep, setCurrentStep] = useState<'intro' | 'task-selection' | 'info-guide'>('intro');
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState<number | null>(null);
  const [userTaskName, setUserTaskName] = useState('');

  // ⭐ 수정: has_multiple_tasks가 아니라 tasks 배열 존재 여부로 판단
  // 과제가 1개든 여러개든, tasks 배열이 있으면 선택 화면 표시
  // tasks가 undefined인 경우를 대비하여 빈 배열로 초기화
  console.log('[TaskSelectionChatbot] writingAnalysis:', writingAnalysis);
  console.log('[TaskSelectionChatbot] writingAnalysis.tasks type:', typeof writingAnalysis.tasks);
  console.log('[TaskSelectionChatbot] writingAnalysis.tasks:', writingAnalysis.tasks);
  const tasks = writingAnalysis.tasks || [];
  const hasTasks = tasks.length > 0;
  console.log('[TaskSelectionChatbot] tasks length:', tasks.length);

  const isUserInputTask = writingAnalysis.task_input_mode === 'user_input' || Boolean((tasks[0] as any)?.user_input_required);

  // E2E 테스트용: 글로벌 함수 노출 (Selenium에서 JavaScript로 직접 호출)
  useEffect(() => {
    const testStartCompanyInfo = () => {
      console.log('[E2E-TEST] __e2e_startCompanyInfo 함수 호출됨');
      const taskToSend = hasTasks ? (selectedTask || 1) : 1;
      const allRequiredInfo = hasTasks
        ? [...new Set([
            ...(writingAnalysis.common_required_info || []),
            ...tasks.flatMap(t => t.required_info || [])
          ])]
        : writingAnalysis.common_required_info || [];
      // ⭐ E2E 테스트에서도 양식구조 전달
      const selectedTaskForE2E = tasks.find(t => t.task_number === taskToSend);
      const formStructure = selectedTaskForE2E?.양식구조;
      console.log('[E2E-TEST] onTaskSelected 호출:', taskToSend, allRequiredInfo, '양식구조:', formStructure);
      onTaskSelected(taskToSend, allRequiredInfo, formStructure, isUserInputTask ? userTaskName : undefined);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__e2e_startCompanyInfo = testStartCompanyInfo;
    console.log('[TaskSelectionChatbot] E2E 테스트 함수 등록: window.__e2e_startCompanyInfo');
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__e2e_startCompanyInfo;
    };
  }, [hasTasks, selectedTask, writingAnalysis, tasks, onTaskSelected, isUserInputTask, userTaskName]);

  // 인트로 단계: AI가 공고 분석 결과 설명
  const renderIntro = () => (
    <div className="space-y-6">
      {/* AI 인사 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <Sparkles className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              공고 심화 분석이 완료되었습니다! ✨
            </h3>
            <p className="text-gray-700 leading-relaxed">
              7분간의 AI 분석을 통해 <strong className="text-blue-600">{announcementTitle}</strong> 공고를 깊이 이해했습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 과제 안내 - 과제가 1개든 여러 개든 통일된 메시지 */}
      <Alert className="bg-orange-50 border-orange-200">
        <Target className="h-5 w-5 text-orange-600" />
        <AlertDescription className="text-gray-800">
          <strong className="text-orange-900">
            {isUserInputTask ? '이 공고는 과제명을 직접 입력하는 방식입니다.' : `이 공고는 ${tasks.length}개의 과제가 있습니다.`}
          </strong>
          <br />
          {isUserInputTask
            ? '신청서에 사용할 과제명을 입력해주시면, 해당 과제에 최적화된 완성도 높은 신청서를 작성해드리겠습니다.'
            : '어떤 과제로 신청서를 작성할지 선택해주시면, 해당 과제에 최적화된 완성도 높은 신청서를 작성해드리겠습니다.'}
        </AlertDescription>
      </Alert>

      {/* 필수 정보 미리보기 */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-gray-50">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-700" />
            신청서 작성에 필요한 기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ul className="space-y-2">
            {(writingAnalysis.common_required_info || []).slice(0, 5).map((info, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>{info}</span>
              </li>
            ))}
            {(writingAnalysis.common_required_info || []).length > 5 && (
              <li className="text-sm text-gray-500 italic">
                ...외 {(writingAnalysis.common_required_info || []).length - 5}개 항목
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* 다음 단계 버튼 */}
      <div className="flex gap-3">
        <Button
          onClick={() => {
            // ✅ 과제가 1개든 여러 개든 항상 선택 화면으로!
            // 완성도 높은 신청서를 위해 과제 선택은 필수 단계
            if (tasks && tasks.length > 0) {
              setCurrentStep('task-selection');
            } else {
              // tasks 배열이 없거나 비어있을 때만 에러
              console.error('[TaskSelectionChatbot] tasks 배열 없음:', writingAnalysis);
            }
          }}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
        >
          {isUserInputTask ? '과제명 입력하기 →' : '과제 선택하기 →'}
        </Button>
      </div>
    </div>
  );

  // 과제 선택 단계
  const renderTaskSelection = () => (
    <div className="space-y-6">
      {/* 안내 메시지 */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-800">
              <strong>어떤 과제로 신청서를 작성하시겠습니까?</strong>
              <br />
              각 과제를 클릭하면 자세한 설명을 볼 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 과제명 직접 입력 */}
      {isUserInputTask ? (
        <Card className="border-2 border-gray-200">
          <CardHeader className="bg-gray-50">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-600" />
              과제명 입력
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <Input
              value={userTaskName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setUserTaskName(e.target.value)}
              placeholder="예: AI 기반 스마트 제조 혁신 과제"
            />
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-gray-800">
                입력한 과제명은 이후 단계(회사 정보 입력/신청서 작성)에 반영됩니다.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
          <div key={task.task_number} className="space-y-2">
            {/* 과제 카드 */}
            <Card
              className={`cursor-pointer transition-all ${
                selectedTask === task.task_number
                  ? 'border-2 border-blue-600 bg-blue-50'
                  : 'border-2 border-gray-200 hover:border-blue-300'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                console.log('[TaskSelectionChatbot] 과제 카드 클릭:', task.task_number);
                setSelectedTask(task.task_number);
                setShowTaskDetails(showTaskDetails === task.task_number ? null : task.task_number);
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-600 text-white px-3 py-1">
                      과제 {task.task_number}
                    </Badge>
                    <h3 className="font-bold text-gray-900">{task.task_name}</h3>
                  </div>
                  {selectedTask === task.task_number && (
                    <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
              </CardContent>
            </Card>

            {/* 과제 상세 정보 (펼침) */}
            {showTaskDetails === task.task_number && (
              <Card className="ml-4 border-l-4 border-blue-400 bg-gray-50">
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {/* 필수 정보 */}
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        이 과제에 필요한 정보
                      </h4>
                      <ul className="space-y-1.5">
                        {task.required_info.map((info, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>{info}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 평가 포인트 */}
                    {task.evaluation_points && task.evaluation_points.length > 0 && (
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-600" />
                          심사 평가 포인트
                        </h4>
                        <ul className="space-y-1.5">
                          {task.evaluation_points.map((point, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-blue-600">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          ))}
        </div>
      )}

      {/* 확인 버튼 */}
      <div className="flex gap-3">
        <Button
          onClick={() => setCurrentStep('intro')}
          variant="outline"
          className="flex-1"
        >
          ← 이전
        </Button>
        <Button
          id="proceed-to-info-guide-btn"
          onClick={() => setCurrentStep('info-guide')}
          disabled={(selectedTask === null && hasTasks && !isUserInputTask) || (isUserInputTask && userTaskName.trim().length === 0)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          이 과제로 작성하기 →
        </Button>
      </div>
    </div>
  );

  // 정보 안내 단계
  const renderInfoGuide = () => {
    // ⭐ 단일 과제일 때 자동으로 과제 1번 선택
    const effectiveTaskNumber = hasTasks ? selectedTask : 1;

    // tasks가 배열인지 확인하고 find 호출
    const selectedTaskData = effectiveTaskNumber && Array.isArray(tasks)
      ? tasks.find(t => t.task_number === effectiveTaskNumber)
      : null;

    const allRequiredInfo = [
      ...(writingAnalysis.common_required_info || []),
      ...(selectedTaskData?.required_info || [])
    ];

    return (
      <div className="space-y-6">
        {/* 선택한 과제 확인 */}
        {selectedTaskData && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-gray-800">
              <strong className="text-green-900">과제 {selectedTaskData.task_number}: {selectedTaskData.task_name}</strong> 로 신청서를 작성합니다.
            </AlertDescription>
          </Alert>
        )}

        {/* AI 안내 메시지 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <Sparkles className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                이제 회사 정보를 수집하겠습니다 💬
              </h3>
              <p className="text-gray-700 leading-relaxed">
                다음 정보들을 대화형으로 물어보겠습니다.
                {selectedTaskData && ' 선택하신 과제에 최적화된 질문을 드릴 예정입니다.'}
              </p>
            </div>
          </div>
        </div>

        {/* 필요한 정보 전체 목록 */}
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-orange-900">
              <FileText className="h-5 w-5" />
              수집할 정보 ({allRequiredInfo.length}개 항목)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allRequiredInfo.map((info, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-gray-800">
                  <CheckCircle2 className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span>{info}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 정보 수집 시작 버튼 */}
        <div className="flex gap-3">
          <Button
            onClick={() => {
              if (hasTasks && currentStep === 'info-guide') {
                setCurrentStep('task-selection');
              } else {
                setCurrentStep('intro');
              }
            }}
            variant="outline"
            className="flex-1"
          >
            ← 이전
          </Button>
          <Button
            data-testid="start-company-info-btn"
            id="start-company-info-btn"
            onClick={() => {
              // ⭐ 단일 과제일 때 자동으로 과제 1번 전달
              const taskToSend = hasTasks ? selectedTask : 1;
              // ⭐ 선택한 과제의 양식구조 전달
              const formStructure = selectedTaskData?.양식구조;
              console.log('[TaskSelectionChatbot] 과제 선택:', taskToSend, '필수정보:', allRequiredInfo, '양식구조:', formStructure);
              onTaskSelected(taskToSend, allRequiredInfo, formStructure, isUserInputTask ? userTaskName : undefined);
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
          >
            회사 정보 입력 시작 →
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              AI 신청서 작성 준비
            </CardTitle>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {currentStep === 'intro' && renderIntro()}
          {currentStep === 'task-selection' && renderTaskSelection()}
          {currentStep === 'info-guide' && renderInfoGuide()}
        </CardContent>
      </Card>
    </div>
  );
}

// ⭐ 양식구조 타입 export
export type { FormStructure, FormSection, FormFieldInfo };
