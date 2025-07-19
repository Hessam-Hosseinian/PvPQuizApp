import React from 'react';
import { motion } from 'framer-motion';
import { LiveGameState, RevealedAnswer } from '../../types';
import Card from '../UI/Card';
import Button from '../UI/Button';
import TimerBar from './TimerBar';
import LoadingSpinner from '../UI/LoadingSpinner';
import { CheckCircle, XCircle } from 'lucide-react';

interface QuestionScreenProps {
    gameState: LiveGameState;
    currentQuestionIndex: number;
    timeLeft: number;
    roundTimerDuration: number;
    selectedChoiceId: number | null;
    revealedAnswers: RevealedAnswer[];
    onAnswerSelect: (questionId: number, choiceId: number) => void;
}

const QuestionScreen: React.FC<QuestionScreenProps> = ({
    gameState,
    currentQuestionIndex,
    timeLeft,
    roundTimerDuration,
    selectedChoiceId,
    revealedAnswers,
    onAnswerSelect
}) => {
    const { current_round, total_rounds } = gameState;

    if (!current_round?.questions?.length) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
                <LoadingSpinner size="lg" />
                <p className="mt-6 text-lg text-dark-200 font-semibold animate-fade-in">Loading...</p>
            </div>
        );
    }

    const question = current_round.questions[currentQuestionIndex];
    if (!question) return <div>Question not found.</div>;

    const revealedAnswerInfo = revealedAnswers.find(a => a.question_id === question.question_id);

    // افکت انتخاب گزینه
    const getChoiceStyle = (choiceId: number): {bgColor?: string; className: string} => {
        if (!selectedChoiceId) {
            return { className: 'bg-dark-700 hover:bg-dark-600 shadow-md hover:shadow-xl border-2 border-dark-600' };
        }
        const isCorrect = choiceId === revealedAnswerInfo?.correct_choice_id;
        const isSelected = choiceId === selectedChoiceId;
        if (isCorrect) {
            return { bgColor: '#22c55e', className: 'scale-105 border-green-400 ring-4 ring-green-300 shadow-2xl animate-bounce-in' };
        }
        if (isSelected) {
            return { bgColor: '#ef4444', className: 'border-red-400 ring-2 ring-red-300 scale-105 shadow-xl animate-bounce-in' };
        }
        return { className: 'bg-dark-700 opacity-50 border-2 border-dark-600' };
    };

    return (
        <motion.div 
            key={`question-view-${current_round.round_number}-${currentQuestionIndex}`}
            className="w-full max-w-3xl flex flex-col items-center mx-auto px-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
        >
            {/* سربرگ راند و سوال */}
            <div className="w-full flex flex-col md:flex-row md:justify-between items-center mb-4 gap-2 animate-fade-in">
                <span className="text-lg md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400 drop-shadow-lg">
                    round {current_round.round_number} / {total_rounds}
                </span>
                <span className="text-base md:text-lg font-bold text-dark-200 bg-dark-700 px-4 py-1 rounded-full shadow border border-dark-500">
                    question {currentQuestionIndex + 1} of {current_round.questions.length}
                </span>
            </div>

            {/* تایمر */}
            <div className="w-full flex items-center gap-4 mb-2 animate-fade-in">
                <div className="flex-1">
                    <TimerBar timeLeft={timeLeft} duration={roundTimerDuration} />
                </div>
                <span className="text-lg font-bold text-primary-400 min-w-[40px] text-center">
                    {timeLeft}
                </span>
            </div>

            {/* سوال */}
            <Card className="w-full p-8 text-center bg-gradient-to-br from-dark-800 to-dark-900 mb-8 min-h-[120px] flex items-center justify-center shadow-2xl border-2 border-dark-700 animate-slide-up">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-lg leading-relaxed">
                    {question.text}
                </h1>
            </Card>

            {/* گزینه‌ها */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                {question.choices.map((choice, index) => {
                    const style = getChoiceStyle(choice.choice_id);
                    return (
                        <motion.div
                            key={choice.choice_id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index, duration: 0.4, type: 'spring' }}
                        >
                            <Button 
                                onClick={() => onAnswerSelect(question.question_id, choice.choice_id)} 
                                disabled={!!selectedChoiceId}
                                bgColor={style.bgColor}
                                className={`w-full text-lg md:text-xl font-bold p-6 flex items-center justify-start h-full transition-all duration-300 transform ${selectedChoiceId ? '' : 'hover:scale-105'} ${style.className}`}
                            >
                                <span className={`flex items-center justify-center w-10 h-10 rounded-full mr-4 text-white text-lg font-extrabold shadow-md ${selectedChoiceId ? (revealedAnswerInfo?.correct_choice_id === choice.choice_id ? 'bg-green-500' : (selectedChoiceId === choice.choice_id ? 'bg-red-500' : 'bg-dark-600')) : 'bg-primary-500'}`}>
                                    {String.fromCharCode(65 + index)}
                                </span>
                                <span className="text-left flex-1 line-clamp-3">{choice.choice_text}</span>
                                {selectedChoiceId && (
                                    revealedAnswerInfo?.correct_choice_id === choice.choice_id 
                                        ? <CheckCircle className="ml-auto w-7 h-7 text-green-400 animate-bounce-in" /> 
                                        : (selectedChoiceId === choice.choice_id && <XCircle className="ml-auto w-7 h-7 text-red-400 animate-bounce-in" />)
                                )}
                            </Button>
                        </motion.div>
                    )
                })}
            </div>
        </motion.div>
    );
};

export default QuestionScreen; 