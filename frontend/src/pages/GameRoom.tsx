import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gamesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Button from '../components/UI/Button';
import Avatar from '../components/UI/Avatar';
import Card from '../components/UI/Card';
import { 
  TrophyIcon, 
  ClockIcon, 
  UsersIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  SparklesIcon,
  TargetIcon,
  CrownIcon
} from 'lucide-react';

// Enhanced Player info card
const PlayerCard: React.FC<{ player: any; score: number; highlight?: boolean }> = ({ player, score, highlight }) => (
  <Card className={`p-8 text-center transition-all duration-500 transform hover:scale-105 relative overflow-hidden ${
    highlight 
      ? 'bg-gradient-to-br from-green-900/30 to-green-800/30 border-2 border-green-500 shadow-2xl shadow-green-500/25' 
      : 'backdrop-blur-sm bg-dark-800/80 border border-dark-600/50 hover:border-primary-500/50'
  }`}> 
    {/* Animated background effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full hover:translate-x-full transition-transform duration-1000"></div>
    
    <div className="relative z-10">
      <div className="relative mb-6">
        <Avatar 
          src={player?.avatar} 
          alt={player?.username} 
          size="xl" 
          className={`ring-4 transition-all duration-300 ${
            highlight 
              ? 'ring-green-500/40 shadow-2xl shadow-green-500/25' 
              : 'ring-primary-500/20 hover:ring-primary-500/40'
          }`}
        />
        {highlight && (
          <div className="absolute -top-2 -right-2">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
              <CrownIcon className="w-5 h-5 text-white animate-pulse" />
            </div>
          </div>
        )}
        {/* Status indicator */}
        <div className="absolute -bottom-1 -left-1">
          <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-dark-800 animate-pulse"></div>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-white font-bold text-2xl mb-2 bg-gradient-to-r from-white to-gray-200 bg-clip-text">
          {player?.username}
        </div>
        <div className="text-dark-300 text-sm">Player</div>
      </div>
      
      <div className="flex items-center justify-center gap-3 bg-gradient-to-r from-dark-700/50 to-dark-800/50 px-6 py-3 rounded-2xl border border-dark-600/50">
        <TrophyIcon className="w-5 h-5 text-primary-400" />
        <span className="text-primary-400 text-3xl font-bold">{score}</span>
        <span className="text-dark-300 text-sm font-medium">points</span>
      </div>
    </div>
  </Card>
);

// Enhanced Players Row with Live Updates
const PlayersRow: React.FC<{ me: any; opponent: any; myScore: number; oppScore: number }> = ({ me, opponent, myScore, oppScore }) => (
  <Card className="p-8 backdrop-blur-sm bg-dark-800/80 border border-dark-600/50 relative overflow-hidden">
    {/* Animated background elements */}
    <div className="absolute inset-0 opacity-5">
      <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-primary-500 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-purple-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
    </div>
    
    <div className="flex items-center justify-between gap-8 flex-wrap relative z-10">
      <div className="flex-1 max-w-sm">
        <PlayerCard player={me} score={myScore} highlight={myScore >= oppScore} />
      </div>
      
      <div className="flex flex-col items-center gap-4 text-dark-400 font-bold text-3xl min-w-[140px]">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/25">
          <TargetIcon className="w-8 h-8 text-white" />
        </div>
        <span className="text-4xl">VS</span>
        
        {/* Enhanced Live Score Animation */}
        <div className="text-center">
          <div className={`text-sm font-medium px-4 py-2 rounded-full border transition-all duration-300 ${
            myScore > oppScore 
              ? 'text-green-400 border-green-500/30 bg-green-500/10' 
              : myScore < oppScore 
              ? 'text-red-400 border-red-500/30 bg-red-500/10' 
              : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
          }`}>
            {myScore > oppScore ? 'Leading' : myScore < oppScore ? 'Behind' : 'Tied'}
          </div>
          <div className="text-xs text-dark-400 mt-1">
            {Math.abs(myScore - oppScore)} pts difference
          </div>
        </div>
      </div>
      
      <div className="flex-1 max-w-sm">
        <PlayerCard player={opponent} score={oppScore} highlight={oppScore > myScore} />
      </div>
    </div>
  </Card>
);

// Enhanced Game Header with Progress
const GameHeader: React.FC<{ round: number; totalRounds: number; timer: number | null }> = ({ round, totalRounds, timer }) => (
  <Card className="p-8 backdrop-blur-sm bg-dark-800/80 border border-dark-600/50 relative overflow-hidden">
    {/* Animated background elements */}
    <div className="absolute inset-0 opacity-5">
      <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-primary-500 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-purple-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
    </div>
    
    <div className="flex items-center justify-between flex-wrap gap-6 relative z-10">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 p-4 rounded-2xl shadow-lg shadow-primary-500/25">
          <TargetIcon className="w-8 h-8 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-3xl mb-2">Round {round} of {totalRounds}</div>
          <div className="text-dark-300 text-lg mb-4">Battle in progress</div>
          
          {/* Enhanced Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-sm text-dark-400 mb-1">
              <span>Progress</span>
              <span>{Math.round((round / totalRounds) * 100)}% Complete</span>
            </div>
            <div className="w-64 bg-dark-700 h-3 rounded-full overflow-hidden border border-dark-600 shadow-inner">
              <div 
                className="h-3 bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-700 ease-out relative overflow-hidden"
                style={{ width: `${(round / totalRounds) * 100}%` }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {timer !== null && (
        <div className="flex items-center gap-4 bg-gradient-to-r from-red-900/30 to-orange-900/30 px-8 py-4 rounded-2xl border border-red-500/30 backdrop-blur-sm">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25 animate-pulse">
            <ClockIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <span className="text-white font-bold text-3xl block">{timer}</span>
            <span className="text-red-300 text-sm font-medium">seconds left</span>
          </div>
        </div>
      )}
    </div>
  </Card>
);

const GameRoom: React.FC = () => {
  const { gameId } = useParams();
  const gameIdNum = Number(gameId);
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user || !user.id || !gameIdNum) return null;
  const [gameState, setGameState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<string | null>(null);
  const [timer, setTimer] = useState<number>(20);
  const pollingRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
  const prevRoundNumberRef = useRef<number | null>(null);
  const [questionTimer, setQuestionTimer] = useState(20);
  const questionTimerRef = useRef<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const roundCompletionRef = useRef<boolean>(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Calculate current question and answer variables
  const currentRound = gameState?.current_round;
  const myAnswers = currentRound?.answers?.filter((a: any) => a.user_id === user?.id) || [];
  const allAnswers = currentRound?.answers || [];
  const gameParticipants = gameState?.participants || [];
  const expectedAnswers = gameParticipants.length * (currentRound?.questions?.length || 0);
  const allQuestionsAnswered = currentRound?.questions && currentRound.questions.length > 0 && myAnswers.length === currentRound.questions.length;
  const allPlayersAnswered = allAnswers.length === expectedAnswers && expectedAnswers > 0 && currentRound?.questions && currentRound.questions.length > 0;
  const currentQuestion = currentRound?.questions?.[currentQuestionIndex];
  const hasAnswered = currentQuestion ? !!myAnswers.find((a: any) => a.question_id === currentQuestion.question_id) : false;
  // Add variable for correct answer
  const myAnswer = currentQuestion ? myAnswers.find((a: any) => a.question_id === currentQuestion.question_id) : null;

  // Debug logging for troubleshooting
  console.log('Game State Debug:', {
    currentRoundNumber: currentRound?.round_number,
    currentQuestionIndex,
    totalQuestions: currentRound?.questions?.length,
    myAnswersCount: myAnswers.length,
    allAnswersCount: allAnswers.length,
    expectedAnswers,
    allQuestionsAnswered,
    allPlayersAnswered,
    currentQuestionId: currentQuestion?.question_id,
    hasAnswered
  });



  // Enhanced error handling with retry logic
  const handleApiCall = async (apiCall: () => Promise<any>, errorMessage: string) => {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await apiCall();
        setRetryCount(0); // Reset retry count on success
        return result;
      } catch (error) {
        lastError = error;
        console.error(`API call failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
        
        if (attempt < maxRetries) {
          setRetryCount(attempt + 1);
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    // All retries failed
    setError(`${errorMessage}: ${lastError?.message || 'Unknown error'}`);
    setRetryCount(0);
    throw lastError;
  };

  // Enhanced game state fetching with retry
  const fetchGameState = async () => {
    return handleApiCall(
      () => gamesAPI.getGameState(gameIdNum, user.id),
      'Failed to load game state'
    );
  };

  // Enhanced answer submission with better feedback and delay
  const handleAnswerSubmit = async (choiceId: number) => {
    if (hasAnswered || submitting || !currentQuestion || !currentRound) {
      console.log('Answer submission blocked:', { hasAnswered, submitting, currentQuestion: !!currentQuestion, currentRound: !!currentRound });
      return;
    }
    
    setSelectedChoice(choiceId);
    setSubmitting(true);
    
    try {
      console.log(`Submitting answer for question ${currentQuestion.question_id}, choice ${choiceId}`);
      
      const res = await gamesAPI.submitAnswer(gameIdNum, currentRound.round_number, {
        user_id: user.id,
        question_id: currentQuestion.question_id,
        choice_id: choiceId,
        response_time_ms: (20 - questionTimer) * 1000,
      });
      
      const isCorrect = res.data.is_correct;
      setAnswerFeedback(isCorrect ? 'Correct answer!' : 'Wrong answer!');
      
      // Get game state immediately after submitting answer
      const stateRes = await fetchGameState();
      setGameState(stateRes.data);
      
      // Add delay to show correct answer before moving to next question
      await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5 second delay
      
      // Move to next question if available
      const nextQuestionIndex = currentQuestionIndex + 1;
      if (stateRes.data.current_round?.questions && nextQuestionIndex < stateRes.data.current_round.questions.length) {
        console.log(`Moving to next question: ${nextQuestionIndex + 1}`);
        setCurrentQuestionIndex(nextQuestionIndex);
        setQuestionTimer(20); // Reset timer for next question
      } else {
        console.log('No more questions in this round, waiting for completion');
        // If no more questions, wait a bit and check again for round completion
        setTimeout(async () => {
          const retryState = await fetchGameState();
          setGameState(retryState.data);
        }, 1000);
      }
    } catch (e) {
      console.error('Error submitting answer:', e);
      setAnswerFeedback('Error submitting answer.');
      setError('Error submitting answer.');
    } finally {
      setSubmitting(false);
      setTimeout(() => {
        setSelectedChoice(null);
        setAnswerFeedback(null);
      }, 3000); // Increased delay to show feedback longer
    }
  };

  // Enhanced auto answer function with delay
  const handleAutoAnswer = async () => {
    if (hasAnswered || submitting || !currentQuestion || !currentRound) return;
    setSubmitting(true);
    try {
      let wrongChoice = null;
      if (currentQuestion?.choices && currentQuestion.choices.length > 0) {
        wrongChoice = currentQuestion.choices.find((c: any) => !c.is_correct)?.choice_id || currentQuestion.choices[0].choice_id;
      }
      await gamesAPI.submitAnswer(gameIdNum, currentRound.round_number, {
        user_id: user.id,
        question_id: currentQuestion.question_id,
        choice_id: wrongChoice ?? 0,
        response_time_ms: 20000
      });
      // Get game state immediately after submitting answer
      const stateRes = await fetchGameState();
      setGameState(stateRes.data);

      // Add delay to show correct answer before moving to next question
      await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5 second delay

      // Move to next question if available
      const nextQuestionIndex = currentQuestionIndex + 1;
      if (stateRes.data.current_round?.questions && nextQuestionIndex < stateRes.data.current_round.questions.length) {
        setCurrentQuestionIndex(nextQuestionIndex);
        setQuestionTimer(20); // Reset timer for next question
      } else {
        // If no more questions, wait a bit and check again for round completion
        setTimeout(async () => {
          const retryState = await fetchGameState();
          setGameState(retryState.data);
        }, 1000);
      }
    } catch (e) {
      console.error('Auto answer error:', e);
      setError('Error submitting auto answer.');
    } finally {
      setSubmitting(false);
      setTimeout(() => {
        setSelectedChoice(null);
        setAnswerFeedback(null);
      }, 3000); // Increased delay to show feedback longer
    }
  };

  // Question timer useEffect - IMPROVED VERSION
  useEffect(() => {
    if (!currentQuestion || hasAnswered || submitting) return;
    
    // Clear existing timer
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
    
    // Start new timer
    questionTimerRef.current = setInterval(() => {
      setQuestionTimer((t) => {
        if (t <= 1) {
          if (questionTimerRef.current) {
            clearInterval(questionTimerRef.current);
            questionTimerRef.current = null;
          }
          // Only auto-answer if not already answered and not currently submitting
          if (!hasAnswered && !submitting && currentQuestion) {
            console.log('Auto-answering question due to timeout');
            handleAutoAnswer();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    
    return () => {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
    };
  }, [currentQuestion?.question_id, hasAnswered, submitting, currentQuestion, currentQuestionIndex]);

  // 1. Only get game state with polling - FIXED VERSION
  useEffect(() => {
    if (!gameIdNum || !user?.id) return;
    
    const fetchState = async () => {
      try {
        const res = await fetchGameState();
        const newGameState = res.data;
        
        // Check if we're transitioning to a new round
        const currentRoundNumber = gameState?.current_round?.round_number;
        const newRoundNumber = newGameState?.current_round?.round_number;
        
        if (newRoundNumber && currentRoundNumber && newRoundNumber !== currentRoundNumber) {
          console.log(`Round transition detected: ${currentRoundNumber} -> ${newRoundNumber}`);
          // New round started, reset question index and timer
          setCurrentQuestionIndex(0);
          setQuestionTimer(20);
          roundCompletionRef.current = false; // Reset round completion flag
        }
        
        setGameState(newGameState);
        setError(null); // Clear any previous errors
        setLoading(false); // Only set loading to false after first successful fetch
      } catch (e) {
        console.error('Error fetching game state:', e);
        // Only set error if we don't have any game state yet
        if (!gameState) {
          setError('Error loading game information.');
          setLoading(false);
        }
      }
    };
    
    // Initial fetch
    setLoading(true);
    fetchState();
    
    // Use consistent polling interval to prevent race conditions
    const pollingInterval = 2000; // Fixed 2-second interval
    pollingRef.current = setInterval(fetchState, pollingInterval);
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [gameIdNum, user?.id]);

  // 2. Manage categoryOptions based on gameState and round_number changes
  useEffect(() => {
    const currentRound = gameState?.current_round;
    if (
      currentRound &&
      !currentRound.category_id &&
      currentRound.category_options &&
      currentRound.category_options.length > 0 &&
      (
        categoryOptions.length === 0 ||
        currentRound.round_number !== prevRoundNumberRef.current
      )
    ) {
      console.log(`Setting category options for round ${currentRound.round_number}:`, currentRound.category_options);
      setCategoryOptions(currentRound.category_options);
      prevRoundNumberRef.current = currentRound.round_number;
    }
    if (currentRound?.category_id && categoryOptions.length > 0) {
      console.log(`Clearing category options for round ${currentRound.round_number} (category already picked)`);
      setCategoryOptions([]);
    }
    // Clear category options when round changes and no category is picked yet
    if (currentRound && !currentRound.category_id && currentRound.round_number !== prevRoundNumberRef.current) {
      console.log(`Clearing category options for new round ${currentRound.round_number}`);
      setCategoryOptions([]);
      prevRoundNumberRef.current = currentRound.round_number;
    }
  }, [gameState]);

  // Timer logic for answering - only for round-level timer, not question timer
  useEffect(() => {
    if (!gameState?.current_round?.time_limit_seconds) return;
    setTimer(gameState.current_round.time_limit_seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState?.current_round?.time_limit_seconds, gameState?.current_round?.round_number]);

  // Reset index when new round starts or new questions arrive
  useEffect(() => {
    setCurrentQuestionIndex(0);
    roundCompletionRef.current = false; // Reset round completion flag for new round
  }, [currentRound?.round_number, currentRound?.questions?.length]);

  // Reset question timer when moving to next question
  useEffect(() => {
    if (currentQuestion && !hasAnswered) {
      setQuestionTimer(20);
    }
  }, [currentQuestionIndex, currentQuestion?.question_id, hasAnswered]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
    };
  }, []);

  // Auto complete round when all questions are answered - SIMPLIFIED VERSION
  useEffect(() => {
    // Simplified conditions for round completion
    const shouldCompleteRound = allPlayersAnswered && 
      currentRound && 
      currentRound.status === 'active' && 
      currentRound.category_id && 
      currentRound.questions && 
      currentRound.questions.length > 0 && 
      !submitting && 
      !roundCompletionRef.current;

    if (shouldCompleteRound) {
      const completeRound = async () => {
        try {
          setSubmitting(true);
          roundCompletionRef.current = true; // Mark as completed to prevent duplicate requests
          
          console.log(`Completing round ${currentRound.round_number} with ${allAnswers.length} answers`);
          
          await gamesAPI.completeRound(gameIdNum, currentRound.round_number);
          
          // Wait a bit for the backend to process
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Get updated game state after completing round
          const res = await fetchGameState();
          setGameState(res.data);
          
          // Reset question index for new round
          setCurrentQuestionIndex(0);
          setQuestionTimer(20);
          
          // Check if all rounds are completed and complete the game
          if (res.data.current_round === null && res.data.game_status === 'active') {
            try {
              console.log('All rounds completed, finishing game');
              await gamesAPI.completeGame(gameIdNum);
              // Get final game state
              const finalRes = await fetchGameState();
              setGameState(finalRes.data);
            } catch (gameCompleteError) {
              console.error('Error completing game:', gameCompleteError);
            }
          }
        } catch (e) {
          console.error('Error completing round:', e);
          setError('Error completing round.');
          roundCompletionRef.current = false; // Reset flag on error
        } finally {
          setSubmitting(false);
        }
      };
      completeRound();
    }
  }, [allPlayersAnswered, currentRound, allAnswers.length, gameIdNum, user?.id, submitting, roundCompletionRef]);



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center p-4">
        <div className="relative">
          <Card className="p-12 text-center max-w-md w-full backdrop-blur-sm bg-dark-800/80 border border-dark-600/50">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse"></div>
              <LoadingSpinner />
            </div>
            <div className="text-dark-300 mt-6 text-lg font-medium">Loading game...</div>
            <div className="text-dark-400 mt-2 text-sm">Preparing your quiz experience</div>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full backdrop-blur-sm bg-dark-800/80 border border-red-500/20">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-500/25">
              <AlertCircleIcon className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-400 rounded-full animate-ping"></div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Loading Error</h3>
          <p className="text-dark-300 mb-8 leading-relaxed">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105"
          >
            <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full backdrop-blur-sm bg-dark-800/80 border border-dark-600/50">
          <div className="w-20 h-20 bg-gradient-to-br from-dark-600 to-dark-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <AlertCircleIcon className="w-10 h-10 text-dark-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Game Not Found</h3>
          <p className="text-dark-300 mb-8 leading-relaxed">The requested game was not found or you don't have access.</p>
          <Button 
            onClick={() => navigate('/play')}
            className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 transition-all duration-300 transform hover:scale-105"
          >
            Back to Games
          </Button>
        </Card>
      </div>
    );
  }

  const { participants: gameParticipantsFromState, current_round, game_status, scores } = gameState;
  const me = gameParticipantsFromState?.find((p: any) => p.user_id === user?.id);
  const opponent = gameParticipantsFromState?.find((p: any) => p.user_id !== user?.id);
  const myScore = scores?.[user?.id] || 0;
  const oppScore = opponent ? scores?.[opponent.user_id] || 0 : 0;

  // Game finished
  if (!current_round && (game_status === 'finished' || game_status === 'completed')) {
    const winner = myScore > oppScore ? me : (myScore < oppScore ? opponent : null);
    const isWinner = winner?.user_id === user?.id;
    const isTie = myScore === oppScore;
    
    // Show confetti for winner
    if (isWinner && !showConfetti) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-4 relative overflow-hidden">
        {/* Enhanced animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-yellow-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
          <div className="absolute top-1/4 right-1/4 w-24 h-24 bg-blue-500/8 rounded-full blur-2xl animate-pulse delay-1500"></div>
          <div className="absolute bottom-1/4 left-1/4 w-28 h-28 bg-green-500/8 rounded-full blur-2xl animate-pulse delay-2000"></div>
        </div>

        {/* Enhanced confetti effect */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(80)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 rounded-full animate-bounce ${
                  i % 4 === 0 ? 'bg-yellow-400' : 
                  i % 4 === 1 ? 'bg-blue-400' : 
                  i % 4 === 2 ? 'bg-green-400' : 'bg-purple-400'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        )}

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Enhanced Game Result Header */}
          <div className="text-center mb-8">
            <div className="relative mb-6">
              <div className={`w-32 h-32 ${isWinner ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : 'bg-gradient-to-br from-dark-600 to-dark-700'} rounded-full flex items-center justify-center mx-auto shadow-2xl ${isWinner ? 'shadow-yellow-500/25 animate-bounce' : ''} relative overflow-hidden`}>
                {isWinner ? (
                  <CrownIcon className="w-16 h-16 text-white" />
                ) : (
                  <TrophyIcon className="w-16 h-16 text-dark-400" />
                )}
                {/* Animated ring effect */}
                <div className="absolute inset-0 rounded-full border-4 border-transparent animate-ping" style={{
                  borderColor: isWinner ? 'rgba(251, 191, 36, 0.3)' : 'rgba(75, 85, 99, 0.3)'
                }}></div>
              </div>
              {isWinner && (
                <div className="absolute -top-4 -right-4">
                  <SparklesIcon className="w-10 h-10 text-yellow-400 animate-pulse" />
                </div>
              )}
            </div>
            
            <h2 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-white via-gray-100 to-gray-200 bg-clip-text">
              {isWinner ? '🎉 You Won! 🎉' : 'Game Finished!'}
            </h2>
            
            <div className="text-xl text-dark-200 mb-8">
              {winner ? (isWinner ? 'Congratulations! You are the champion!' : `${opponent?.username} won!`) : 'Game tied!'}
            </div>
          </div>

          {/* Enhanced Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 transform transition-all duration-500 hover:scale-105">
              <div className="flex items-center">
                <TargetIcon className="w-8 h-8 text-white mr-3" />
                <div>
                  <p className="text-white/80 text-sm">Total Rounds</p>
                  <p className="text-white text-2xl font-bold">{gameState.total_rounds}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-600 to-green-700 transform transition-all duration-500 hover:scale-105">
              <div className="flex items-center">
                <ClockIcon className="w-8 h-8 text-white mr-3" />
                <div>
                  <p className="text-white/80 text-sm">Game Duration</p>
                  <p className="text-white text-2xl font-bold">
                    {Math.floor((Date.now() - new Date(gameState.created_at).getTime()) / 60000)}m
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-purple-600 to-purple-700 transform transition-all duration-500 hover:scale-105">
              <div className="flex items-center">
                <TrophyIcon className="w-8 h-8 text-white mr-3" />
                <div>
                  <p className="text-white/80 text-sm">Winner Score</p>
                  <p className="text-white text-2xl font-bold">{Math.max(myScore, oppScore)}</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Enhanced Player Comparison */}
          <Card className="p-8 backdrop-blur-sm bg-dark-800/80 border border-dark-600/50 mb-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Final Results</h3>
              <p className="text-dark-300">See how you performed against your opponent</p>
            </div>
            
            <div className="flex gap-8 justify-center flex-wrap">
              <div className="flex-1 max-w-sm">
                <PlayerCard player={me} score={myScore} highlight={winner?.user_id === me?.user_id} />
              </div>
              <div className="flex flex-col items-center justify-center text-dark-400 font-bold text-3xl min-w-[120px]">
                <TargetIcon className="w-10 h-10 mb-2" />
                <span>VS</span>
                <div className="text-sm text-primary-400 font-normal mt-2">
                  {myScore > oppScore ? 'You Won!' : myScore < oppScore ? 'You Lost' : 'Tied!'}
                </div>
              </div>
              <div className="flex-1 max-w-sm">
                <PlayerCard player={opponent} score={oppScore} highlight={winner?.user_id === opponent?.user_id} />
              </div>
            </div>
          </Card>
          
          {/* Enhanced Action Buttons */}
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              onClick={() => navigate('/play')}
              className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 transition-all duration-300 transform hover:scale-105 px-8 py-4 text-lg font-semibold"
            >
              <TrophyIcon className="w-5 h-5 mr-2" />
              Play Again
            </Button>
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="border-dark-600 hover:border-primary-500 transition-all duration-300 px-8 py-4 text-lg font-semibold"
            >
              <TargetIcon className="w-5 h-5 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced waiting for opponent to join
  if (!current_round && (game_status === 'waiting' || game_status === 'active')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <Card className="p-12 text-center backdrop-blur-sm bg-dark-800/80 border border-dark-600/50 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-32 h-32 bg-primary-500 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            
            <div className="relative z-10">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-primary-500/25 animate-pulse">
                  <UsersIcon className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary-400 rounded-full animate-ping"></div>
                <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-purple-400 rounded-full animate-ping delay-500"></div>
              </div>
              
              <h3 className="text-3xl font-bold text-white mb-4">
                {game_status === 'waiting' ? 'Waiting for Opponent' : 'Starting Game'}
              </h3>
              
              <div className="text-lg text-dark-200 mb-4">
                {game_status === 'waiting' ? 'Looking for a worthy challenger...' : 'Preparing your game...'}
              </div>
              
              <div className="text-sm text-dark-400 mb-8">
                {game_status === 'waiting' ? 'This won\'t take long' : 'Please wait while we set up your game'}
              </div>
              
              <div className="flex items-center justify-center gap-4">
                <LoadingSpinner />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Enhanced category selection phase
  if (current_round && !current_round.category_id) {
    const isMyTurn = current_round.picker_turn === user?.id;
    const categoryOptionsToShow = categoryOptions.length > 0 ? categoryOptions : current_round.category_options || [];
    
    console.log('Category selection phase:', {
      roundNumber: current_round.round_number,
      isMyTurn,
      pickerTurn: current_round.picker_turn,
      userId: user?.id,
      categoryOptionsLength: categoryOptionsToShow.length,
      categoryOptionsFromState: current_round.category_options?.length || 0,
      categoryOptionsFromLocal: categoryOptions.length
    });
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-4">
        <div className="max-w-7xl mx-auto">
          <GameHeader round={current_round.round_number} totalRounds={gameState.total_rounds} timer={null} />
          <PlayersRow me={me} opponent={opponent} myScore={myScore} oppScore={oppScore} />
          
          <Card className="p-12 mt-8 backdrop-blur-sm bg-dark-800/80 border border-dark-600/50 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-10 left-10 w-32 h-32 bg-primary-500 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>
            
            <div className="text-center relative z-10">
              <div className="mb-10">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-primary-500/25 mb-6">
                  <TargetIcon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-4xl font-bold text-white mb-4">Select Category</h3>
                <div className="text-dark-300 text-xl">
                  {isMyTurn ? 'Choose your battlefield wisely!' : 'Your opponent is choosing the category...'}
                </div>
              </div>
              
              {isMyTurn ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {categoryOptionsToShow.map((cat: any, index: number) => {
                    // Get category-specific icon and color
                    const getCategoryIcon = (categoryName: string) => {
                      const name = categoryName.toLowerCase();
                      if (name.includes('science') || name.includes('technology')) return '🧪';
                      if (name.includes('history')) return '🏛️';
                      if (name.includes('geography') || name.includes('world')) return '🌍';
                      if (name.includes('sports')) return '⚽';
                      if (name.includes('entertainment') || name.includes('movie') || name.includes('music')) return '🎬';
                      if (name.includes('art') || name.includes('culture')) return '🎨';
                      if (name.includes('literature') || name.includes('book')) return '📚';
                      if (name.includes('math') || name.includes('mathematics')) return '🔢';
                      if (name.includes('nature') || name.includes('animals')) return '🌿';
                      return '🎯';
                    };

                    const getCategoryColor = (categoryName: string) => {
                      const name = categoryName.toLowerCase();
                      if (name.includes('science') || name.includes('technology')) return 'from-blue-500 to-cyan-500';
                      if (name.includes('history')) return 'from-amber-500 to-orange-500';
                      if (name.includes('geography') || name.includes('world')) return 'from-green-500 to-emerald-500';
                      if (name.includes('sports')) return 'from-red-500 to-pink-500';
                      if (name.includes('entertainment') || name.includes('movie') || name.includes('music')) return 'from-purple-500 to-indigo-500';
                      if (name.includes('art') || name.includes('culture')) return 'from-pink-500 to-rose-500';
                      if (name.includes('literature') || name.includes('book')) return 'from-yellow-500 to-amber-500';
                      if (name.includes('math') || name.includes('mathematics')) return 'from-indigo-500 to-blue-500';
                      if (name.includes('nature') || name.includes('animals')) return 'from-emerald-500 to-green-500';
                      return 'from-primary-500 to-primary-600';
                    };

                    const categoryIcon = getCategoryIcon(cat.name);
                    const categoryColor = getCategoryColor(cat.name);

                    return (
                      <div
                        key={cat.id}
                        className="group relative"
                        style={{ animationDelay: `${index * 200}ms` }}
                      >
                        <Button
                          onClick={async () => {
                            if (submitting) return;
                            console.log(`Picking category ${cat.id} for round ${current_round.round_number}`);
                            setSubmitting(true);
                            try {
                              await gamesAPI.pickCategory(gameIdNum, current_round.round_number, user.id, cat.id);
                              const res = await fetchGameState();
                              setGameState(res.data);
                            } finally {
                              setSubmitting(false);
                            }
                          }}
                          loading={submitting}
                          className={`w-full p-12 h-auto text-left bg-gradient-to-br from-dark-700 to-dark-800 hover:from-dark-600 hover:to-dark-700 border-2 border-dark-600 hover:border-primary-500 transition-all duration-500 transform hover:scale-105 group-hover:shadow-2xl group-hover:shadow-primary-500/25 rounded-3xl relative overflow-hidden`}
                          variant="outline"
                          disabled={submitting}
                        >
                          {/* Animated background effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                          
                          {/* Category icon background */}
                          <div className={`absolute top-4 right-4 w-16 h-16 bg-gradient-to-br ${categoryColor} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 opacity-20 group-hover:opacity-30`}>
                            <span className="text-2xl">{categoryIcon}</span>
                          </div>
                          
                          <div className="relative z-10 flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-4">
                                <div className={`w-12 h-12 bg-gradient-to-br ${categoryColor} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                  <span className="text-xl">{categoryIcon}</span>
                                </div>
                                <div className="font-bold text-white text-2xl group-hover:text-primary-300 transition-colors">
                                  {cat.name}
                                </div>
                              </div>
                              <div className="text-sm text-dark-300 group-hover:text-dark-200 transition-colors leading-relaxed pl-15">
                                {cat.description}
                              </div>
                              
                              {/* Category stats or info */}
                              <div className="mt-4 flex items-center gap-4 text-xs text-dark-400">
                                <div className="flex items-center gap-1">
                                  <TargetIcon className="w-3 h-3" />
                                  <span>Questions available</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ClockIcon className="w-3 h-3" />
                                  <span>20s per question</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Selection indicator */}
                            <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center group-hover:bg-primary-500/40 transition-colors border-2 border-primary-500/30 group-hover:border-primary-500/60">
                              <TargetIcon className="w-4 h-4 text-primary-400 group-hover:text-primary-300" />
                            </div>
                          </div>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-12 text-center">
                  <div className="relative mx-auto mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-primary-500/25 animate-pulse">
                      <TargetIcon className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary-400 rounded-full animate-ping"></div>
                    <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-purple-400 rounded-full animate-ping delay-500"></div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4">Opponent is Choosing</h3>
                  <div className="text-lg text-dark-200 mb-6">
                    Your opponent is selecting the category for this round...
                  </div>
                  
                  <div className="flex items-center justify-center gap-4">
                    <LoadingSpinner />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                  
                  <div className="mt-6 text-sm text-dark-400">
                    This won't take long...
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Question answering phase
  if (current_round && current_round.category_id) {
    // Log questions for each round for manual inspection
    console.log('Current round questions:', current_round.questions);
    // Enhanced waiting state when all questions answered
    if (allQuestionsAnswered) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-4">
          <div className="max-w-5xl mx-auto">
            <GameHeader round={current_round.round_number} totalRounds={gameState.total_rounds} timer={null} />
            <PlayersRow me={me} opponent={opponent} myScore={myScore} oppScore={oppScore} />
            
            <Card className="p-12 mt-8 backdrop-blur-sm bg-dark-800/80 border border-dark-600/50 relative overflow-hidden">
              {/* Animated background elements */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-10 left-10 w-32 h-32 bg-green-500 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
              </div>
              
              <div className="text-center relative z-10">
                <div className="mb-10">
                  <div className="relative mx-auto mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/25">
                      <CheckCircleIcon className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-400 rounded-full animate-ping"></div>
                    <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-blue-400 rounded-full animate-ping delay-500"></div>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">Answers Submitted!</h3>
                  <div className="text-xl text-dark-200 mb-4">
                    {submitting ? 'Completing round...' : 'Waiting for opponent to finish...'}
                  </div>
                  <div className="text-sm text-dark-400 mb-8">
                    {submitting ? 'Please wait while we finish this round' : 'Your answers are locked in'}
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-4">
                  <LoadingSpinner />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      );
    }
    // Show next question
    if (currentQuestion) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-4">
          <div className="max-w-6xl mx-auto">
            <GameHeader round={current_round.round_number} totalRounds={gameState.total_rounds} timer={questionTimer} />
            <PlayersRow me={me} opponent={opponent} myScore={myScore} oppScore={oppScore} />
            
            {/* Control Buttons */}
            <div className="flex gap-2 mb-4 justify-center"></div>
            
            <Card className="p-12 mt-8 backdrop-blur-sm bg-dark-800/80 border border-dark-600/50 relative overflow-hidden">
              {/* Animated background elements */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-10 left-10 w-32 h-32 bg-primary-500 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-yellow-500 rounded-full blur-3xl animate-pulse delay-500"></div>
              </div>
              
              {/* Current question number and timer */}
              <div className="mb-10 flex items-center justify-between flex-wrap gap-6 relative z-10">
                <div className="flex items-center gap-4 bg-gradient-to-r from-primary-900/30 to-primary-800/30 px-6 py-4 rounded-2xl border border-primary-500/30 backdrop-blur-sm">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                    <TargetIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-xl">
                      Question {currentQuestionIndex + 1} of {currentRound?.questions?.length}
                    </div>
                    <div className="text-primary-300 text-sm font-medium">
                      Round {currentRound?.round_number}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 bg-gradient-to-r from-red-900/30 to-orange-900/30 px-8 py-4 rounded-2xl border border-red-500/30 backdrop-blur-sm">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25 animate-pulse">
                    <ClockIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold text-3xl">{questionTimer}</div>
                    <div className="text-red-300 text-sm font-medium">seconds left</div>
                  </div>
                </div>
              </div>
              
              {/* Question text with enhanced styling */}
              <div className="mb-12 relative z-10">
                <div className="bg-gradient-to-r from-dark-700/50 to-dark-800/50 p-8 rounded-3xl border border-dark-600/50 backdrop-blur-sm">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white font-bold text-sm">Q</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white leading-relaxed bg-gradient-to-r from-white via-gray-100 to-gray-200 bg-clip-text">
                      {currentQuestion.text}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-blue-300 text-sm font-medium">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    Choose the correct answer below
                  </div>
                </div>
              </div>
              
              {/* Answer choices with enhanced styling */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 relative z-10">
                {currentQuestion.choices?.map((choice: any, index: number) => {
                  // Determine correct/incorrect status
                  const isMySelected = selectedChoice === choice.choice_id;
                  const isCorrect = choice.is_correct;
                  const isAnswered = hasAnswered;
                  const isMyAnswer = myAnswer?.choice_id === choice.choice_id;
                  
                  return (
                    <div
                      key={choice.choice_id}
                      className="group"
                      style={{ animationDelay: `${index * 150}ms` }}
                    >
                      <button
                        className={`w-full p-8 rounded-3xl border-3 transition-all duration-500 text-lg font-medium focus:outline-none focus:ring-4 focus:ring-primary-500/50 focus:ring-offset-4 focus:ring-offset-dark-800 transform hover:scale-105 relative overflow-hidden
                          ${isMySelected 
                            ? 'border-primary-500 bg-gradient-to-br from-primary-900/80 to-primary-800/80 text-white shadow-2xl shadow-primary-500/30 ring-4 ring-primary-500/30' 
                            : 'border-dark-600 bg-gradient-to-br from-dark-700/80 to-dark-800/80 text-dark-200 hover:border-primary-400 hover:bg-gradient-to-br hover:from-primary-900/40 hover:to-primary-800/40 hover:text-white hover:shadow-xl hover:shadow-primary-500/20'
                          }
                          ${isAnswered && isCorrect 
                            ? 'border-green-500 bg-gradient-to-br from-green-900/80 to-green-800/80 text-white shadow-2xl shadow-green-500/30 ring-4 ring-green-500/30' 
                            : ''
                          }
                          ${isAnswered && isMyAnswer && !isCorrect 
                            ? 'border-red-500 bg-gradient-to-br from-red-900/80 to-red-800/80 text-white shadow-2xl shadow-red-500/30 ring-4 ring-red-500/30' 
                            : ''
                          }
                          ${isAnswered 
                            ? 'opacity-90 cursor-not-allowed transform scale-98' 
                            : 'hover:shadow-2xl hover:shadow-primary-500/20'
                          }`}
                        disabled={isAnswered || submitting}
                        onClick={() => handleAnswerSubmit(choice.choice_id)}
                      >
                        {/* Animated background effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300 ${
                              isMySelected 
                                ? 'bg-primary-500 border-primary-400 text-white' 
                                : isAnswered && isCorrect
                                ? 'bg-green-500 border-green-400 text-white'
                                : isAnswered && isMyAnswer && !isCorrect
                                ? 'bg-red-500 border-red-400 text-white'
                                : 'bg-dark-600 border-dark-500 text-dark-300 group-hover:bg-primary-500 group-hover:border-primary-400 group-hover:text-white'
                            }`}>
                              <span className="font-bold text-sm">
                                {String.fromCharCode(65 + index)} {/* A, B, C, D */}
                              </span>
                            </div>
                            <span className="text-left leading-relaxed">{choice.choice_text}</span>
                          </div>
                          
                          {/* Show correct/incorrect icons */}
                          {isAnswered && isCorrect && (
                            <div className="flex items-center gap-3 bg-green-900/50 px-4 py-2 rounded-full border border-green-500/30">
                              <CheckCircleIcon className="w-6 h-6 text-green-400" />
                              <span className="text-green-400 text-sm font-bold">Correct!</span>
                            </div>
                          )}
                          {isAnswered && isMyAnswer && !isCorrect && (
                            <div className="flex items-center gap-3 bg-red-900/50 px-4 py-2 rounded-full border border-red-500/30">
                              <XCircleIcon className="w-6 h-6 text-red-400" />
                              <span className="text-red-400 text-sm font-bold">Wrong</span>
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
              
              {/* Show answer feedback with enhanced styling */}
              {answerFeedback && (
                <div className={`text-xl font-bold text-center p-8 rounded-3xl mb-8 border-2 transition-all duration-700 transform animate-pulse relative overflow-hidden ${
                  answerFeedback === 'Correct answer!' 
                    ? 'bg-gradient-to-r from-green-900/40 to-green-800/40 border-green-500 text-green-400 shadow-2xl shadow-green-500/30' 
                    : 'bg-gradient-to-r from-red-900/40 to-red-800/40 border-red-500 text-red-400 shadow-2xl shadow-red-500/30'
                }`}>
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full animate-pulse"></div>
                  
                  <div className="relative z-10 flex items-center justify-center gap-4">
                    {answerFeedback === 'Correct answer!' ? (
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50">
                        <CheckCircleIcon className="w-6 h-6 text-white" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50">
                        <XCircleIcon className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <span className="text-2xl">{answerFeedback}</span>
                  </div>
                </div>
              )}
              
              {/* Enhanced timer progress bar */}
              <div className="mt-10 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-dark-300 font-medium">Time Remaining</span>
                  <span className="text-dark-300 font-medium">{Math.floor((questionTimer / 20) * 100)}%</span>
                </div>
                <div className="w-full bg-dark-700 h-6 rounded-full overflow-hidden border border-dark-600 shadow-inner">
                  <div
                    className={`h-6 rounded-full transition-all duration-1000 ease-linear relative overflow-hidden ${
                      questionTimer > 10 
                        ? 'bg-gradient-to-r from-green-500 to-green-600' 
                        : questionTimer > 5
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                        : 'bg-gradient-to-r from-red-500 to-red-600 animate-pulse'
                    }`}
                    style={{ width: `${(questionTimer / 20) * 100}%` }}
                  >
                    {/* Animated shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full animate-pulse"></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-dark-400 mt-2">
                  <span>0s</span>
                  <span>20s</span>
                </div>
              </div>
              
              {/* Show error message with enhanced styling */}
              {error && (
                <div className="mt-8 p-6 bg-gradient-to-r from-red-900/30 to-red-800/30 border border-red-500/50 rounded-2xl text-red-400 text-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      );
    }
    // Fallback
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full backdrop-blur-sm bg-dark-800/80 border border-dark-600/50">
          <LoadingSpinner />
          <div className="text-dark-300 mt-4">Loading question...</div>
        </Card>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center p-4">
      <Card className="p-8 text-center max-w-md w-full backdrop-blur-sm bg-dark-800/80 border border-dark-600/50">
        <LoadingSpinner />
        <div className="text-dark-300 mt-4">Loading...</div>
      </Card>
    </div>
  );
};

export default GameRoom; 