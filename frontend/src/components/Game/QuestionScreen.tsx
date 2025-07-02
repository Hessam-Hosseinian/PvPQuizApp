import React from 'react';
import { motion } from 'framer-motion';
import { LiveGameState, RevealedAnswer, GameQuestion, GameQuestionChoice } from '../../types';
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
            <div className="text-center">
                <LoadingSpinner />
                <p className="mt-4 text-dark-300">Loading round...</p>
            </div>
        );
    }

    const question = current_round.questions[currentQuestionIndex];
    if (!question) return <div>Question not found.</div>;

    const revealedAnswerInfo = revealedAnswers.find(a => a.question_id === question.question_id);

    const getChoiceStyle = (choiceId: number): {bgColor?: string; className: string} => {
        if (!selectedChoiceId) {
            return { className: 'bg-dark-700 hover:bg-dark-600' };
        }
    
        const isCorrect = choiceId === revealedAnswerInfo?.correct_choice_id;
        const isSelected = choiceId === selectedChoiceId;
    
        if (isCorrect) {
            return { bgColor: '#22c55e', className: 'scale-105 border-green-400' }; // green-500
        }
        if (isSelected) {
            return { bgColor: '#4b5563', className: 'border-gray-500' }; // gray-600
        }
        
        return { className: 'bg-dark-700 opacity-50' };
    };

    return (
        <motion.div 
            key={`question-view-${current_round.round_number}-${currentQuestionIndex}`}
            className="w-full max-w-4xl flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
        >
            <div className="w-full flex justify-between items-center mb-2 text-sm text-dark-300">
                <span>Round {current_round.round_number} / {total_rounds}</span>
                <span>Question {currentQuestionIndex + 1} of {current_round.questions.length}</span>
            </div>
            
            <TimerBar timeLeft={timeLeft} duration={roundTimerDuration} />
            
            <Card className="w-full p-8 text-center bg-dark-900 mb-6 min-h-[150px] flex items-center justify-center">
                <h1 className="text-2xl md:text-3xl font-bold">{question.text}</h1>
            </Card>
            
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                {question.choices.map((choice, index) => {
                    const style = getChoiceStyle(choice.choice_id);
                    return (
                        <Button 
                            key={choice.choice_id} 
                            onClick={() => onAnswerSelect(question.question_id, choice.choice_id)} 
                            disabled={!!selectedChoiceId}
                            bgColor={style.bgColor}
                            className={`text-lg p-6 justify-start h-full transition-all duration-300 transform ${selectedChoiceId ? '' : 'hover:scale-105'} ${style.className}`}
                        >
                            <span className="font-bold mr-4">{String.fromCharCode(65 + index)}</span>
                            <span className="text-left flex-1">{choice.choice_text}</span>
                            {selectedChoiceId && (revealedAnswerInfo?.correct_choice_id === choice.choice_id ? <CheckCircle className="ml-auto w-6 h-6"/> : (selectedChoiceId === choice.choice_id && <XCircle className="ml-auto w-6 h-6"/>))}
                        </Button>
                    )
                })}
            </div>
        </motion.div>
    );
};

export default QuestionScreen; 