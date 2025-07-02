import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { gamesAPI } from '../services/api';
import { AnimatePresence } from 'framer-motion';
import { RevealedAnswer } from '../types';
import GameEndScreen from '../components/Game/GameEndScreen';
import WaitingForNextRound from '../components/Game/WaitingForNextRound';
import PlayerHeader from '../components/Game/PlayerHeader';
import CategorySelection from '../components/Game/CategorySelection';
import QuestionScreen from '../components/Game/QuestionScreen';
import WaitingForOpponent from '../components/Game/WaitingForOpponent';
import { useGameState } from '../hooks/useGameState';

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { gameState, loading, error, setGameState } = useGameState();
  
  const ROUND_TIMER_DURATION = 15;
  // Note: timeLeft state is now managed based on gameState changes.
  const [timeLeft, setTimeLeft] = useState(ROUND_TIMER_DURATION);
  const [categoryTimeLeft, setCategoryTimeLeft] = useState(ROUND_TIMER_DURATION);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<RevealedAnswer[]>([]);
  const submissionLockRef = useRef(new Set<number>());
  
  // This effect resets local UI state when the round changes from the server
  useEffect(() => {
      if (gameState?.current_round) {
          setCurrentQuestionIndex(0);
          setSelectedChoiceId(null);
          setRevealedAnswers([]);
          submissionLockRef.current.clear();
          setTimeLeft(ROUND_TIMER_DURATION);
          setCategoryTimeLeft(ROUND_TIMER_DURATION);
      }
  }, [gameState?.current_round?.round_number]);

  const advanceToNextStep = useCallback(async () => {
    if (!gameId || !gameState?.current_round) return;
    const { current_round, total_rounds } = gameState;
    const totalQuestionsInRound = current_round.questions.length;
    
    if (currentQuestionIndex < totalQuestionsInRound - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedChoiceId(null);
      setTimeLeft(ROUND_TIMER_DURATION);
    } else {
      // The 'isWaitingForNextRound' state is now implicitly handled by gameState
      try {
        await gamesAPI.completeRound(parseInt(gameId), current_round.round_number);
        if (current_round.round_number === total_rounds) {
          await gamesAPI.completeGame(parseInt(gameId));
        }
      } catch (err: any) {
        console.log("Waiting for opponent..."); // This will be handled by socket updates
      }
    }
  }, [gameId, gameState, currentQuestionIndex]);

  const handleAnswerSelect = useCallback(async (
    questionId: number, 
    choiceId: number, 
  ) => {
    if (submissionLockRef.current.has(questionId) || !gameId || !user || !gameState?.current_round) return;
    submissionLockRef.current.add(questionId);
    
    setSelectedChoiceId(choiceId);

    try {
      const res = await gamesAPI.submitAnswer(
        parseInt(gameId), 
        gameState.current_round.round_number, 
        { user_id: user.id, question_id: questionId, choice_id: choiceId }
      );
      
      // Update local state immediately for responsiveness
      setRevealedAnswers(prev => [...prev, { question_id: questionId, correct_choice_id: res.data.correct_choice_id }]);
      if (res.data.is_correct) {
        setGameState(prev => {
          if (!prev) return prev;
          const newParticipants = prev.participants.map(p => 
            p.user_id === user.id ? { ...p, score: p.score + res.data.points_earned } : p
          );
          return { ...prev, participants: newParticipants };
        });
      }
      // Note: The authoritative gameState update will come via WebSocket
    } catch (err: any) {
      // The useGameState hook will handle and display the error
      console.error(err);
    } finally {
        setTimeout(() => {
            advanceToNextStep();
        }, 2000);
    }
  }, [gameId, advanceToNextStep, user, gameState, setGameState]);
  
  const handleTimeUp = useCallback(() => {
    if (!gameState?.current_round || !user) return;
    
    const currentQuestion = gameState.current_round.questions[currentQuestionIndex];
    if (!currentQuestion || submissionLockRef.current.has(currentQuestion.question_id)) {
        return;
    }

    const choices = currentQuestion.choices;
    if (choices && choices.length > 0) {
        const randomChoice = choices[Math.floor(Math.random() * choices.length)];
        handleAnswerSelect(currentQuestion.question_id, randomChoice.choice_id);
    }
  }, [gameState, user, currentQuestionIndex, handleAnswerSelect]);

  const handleSelectCategory = useCallback(async (categoryId: number) => {
    if (!gameId || !user || !gameState?.current_round) return;
    try {
      if(submissionLockRef.current.has(gameState.current_round.round_number)) return;
      submissionLockRef.current.add(gameState.current_round.round_number);
      
      await gamesAPI.pickCategory(
        parseInt(gameId), 
        gameState.current_round.round_number, 
        user.id, 
        categoryId
      );
      // No need to fetch, update will come via socket
    } catch (err: any) {
      // Error will be handled by the hook
      console.error(err);
    }
  }, [gameId, user, gameState]);

  // --- Timers ---
  useEffect(() => {
    if (!gameState?.current_round) return;

    const isCategorySelectionPhase = !gameState.current_round.category_id;
    if (isCategorySelectionPhase) {
        const timerId = setInterval(() => {
            setCategoryTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timerId);
    } else {
        const isQuestionPhase = !selectedChoiceId;
        if (isQuestionPhase) {
            const timerId = setInterval(() => {
              setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
            }, 1000);
            return () => clearInterval(timerId);
        }
    }
  }, [gameState?.current_round, selectedChoiceId, currentQuestionIndex]);
  
  // --- Time's Up Handlers ---
  useEffect(() => {
    if (timeLeft <= 0) {
        handleTimeUp();
    }
  }, [timeLeft, handleTimeUp]);

  useEffect(() => {
    if (categoryTimeLeft <= 0 && gameState?.current_round) {
        const { current_round } = gameState;
        const isCategorySelectionPhase = !current_round.category_id;
        const isMyTurnToPick = current_round.category_picker_id === user?.id;

        if (isCategorySelectionPhase && isMyTurnToPick && current_round.category_options?.length > 0) {
            if (submissionLockRef.current.has(current_round.round_number)) return;
            const randomCategory = current_round.category_options[Math.floor(Math.random() * current_round.category_options.length)];
            handleSelectCategory(randomCategory.id);
        }
    }
  }, [categoryTimeLeft, gameState, user, handleSelectCategory]);


  if (loading && !gameState) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-dark-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-dark-900 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!gameState) {
    return <div className="flex justify-center items-center min-h-screen bg-dark-900">No game data found.</div>;
  }
  
  // A round is considered "waiting" if one player has finished but the round is not yet complete on the server
  const isWaitingForOpponentToFinishRound = 
    !gameState.current_round?.questions[currentQuestionIndex] && 
    gameState.game_status === 'active' &&
    gameState.current_round?.status === 'active';

  if (gameState.game_status === 'completed' || !gameState.current_round) {
    return <GameEndScreen gameState={gameState} />;
  }
  
  if (isWaitingForOpponentToFinishRound) {
    return <WaitingForNextRound />;
  }

  const { participants, current_round } = gameState;
  if (!user) return <div className="flex justify-center items-center min-h-screen bg-dark-900">User not found. Please log in.</div>;
  
  const player1 = participants.find(p => p.user_id === user?.id) || participants[0];
  const player2 = participants.find(p => p.user_id !== user?.id) || participants[1];
  const isMyTurnToPick = current_round.category_picker_id === user?.id;
  const picker = participants.find(p => p.user_id === current_round.category_picker_id);

  const isCategorySelectionPhase = !current_round.category_id;
  
  return (
    <div className="min-h-screen bg-dark-800 text-white p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      
      {player1 && player2 && (
        <PlayerHeader 
            player1={player1}
            player2={player2}
            isMyTurnToPick={isMyTurnToPick}
            isCategorySelectionPhase={isCategorySelectionPhase}
        />
      )}

      <div className="w-full max-w-4xl flex-grow flex items-center justify-center">
        <AnimatePresence mode="wait">
            {isCategorySelectionPhase 
              ? (
                isMyTurnToPick ? (
                    <CategorySelection 
                        roundNumber={current_round.round_number}
                        picker={picker}
                        isMyTurnToPick={isMyTurnToPick}
                        categoryOptions={current_round.category_options || []}
                        onSelectCategory={handleSelectCategory}
                        timeLeft={categoryTimeLeft}
                        duration={ROUND_TIMER_DURATION}
                    />
                ) : (
                    <WaitingForOpponent 
                        message={`Waiting for ${picker?.username || 'opponent'} to pick...`}
                        subtext="The next round will begin shortly."
                    />
                )
              )
              : (
                <QuestionScreen 
                    gameState={gameState}
                    currentQuestionIndex={currentQuestionIndex}
                    timeLeft={timeLeft}
                    roundTimerDuration={ROUND_TIMER_DURATION}
                    selectedChoiceId={selectedChoiceId}
                    revealedAnswers={revealedAnswers}
                    onAnswerSelect={handleAnswerSelect}
                />
              )
            }
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GamePage; 