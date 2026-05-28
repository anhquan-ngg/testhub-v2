import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';

export function useModelQuery<T = any>(model: string, action: string, args?: any, options?: { enabled?: boolean }) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(options?.enabled !== false);
  const [error, setError] = useState<any>(null);

  const refetch = useCallback(async () => {
    if (options?.enabled === false) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiClient.post(`/model/${model}/${action}`, { args: args ?? {} });
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [model, action, JSON.stringify(args), options?.enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}

export function useModelMutation<T = any>(model: string, action: string, globalOptions?: { onSuccess?: (data: any) => void, onError?: (err: any) => void }) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<any>(null);

  const mutateAsync = async (args: any) => {
    setIsPending(true);
    try {
      const res = await apiClient.post(`/model/${model}/${action}`, { args });
      setError(null);
      return res.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  const mutate = (args: any, options?: { onSuccess?: (data: any) => void, onError?: (err: any) => void }) => {
    mutateAsync(args)
      .then(res => {
        options?.onSuccess?.(res);
        globalOptions?.onSuccess?.(res);
      })
      .catch(err => {
        if (options?.onError) {
          options.onError(err);
        } else if (globalOptions?.onError) {
          globalOptions.onError(err);
        }
      });
  };

  return { mutate, mutateAsync, isPending, isLoading: isPending, error };
}

export const useCountUser = (args?: any, options?: any) => useModelQuery('User', 'count', args, options);
export const useFindManyUser = (args?: any, options?: any) => useModelQuery('User', 'findMany', args, options);
export const useFindUniqueUser = (args?: any, options?: any) => useModelQuery('User', 'findUnique', args, options);
export const useCreateUser = (options?: any) => useModelMutation('User', 'create', options);
export const useUpdateUser = (options?: any) => useModelMutation('User', 'update', options);
export const useDeleteUser = (options?: any) => useModelMutation('User', 'delete', options);

export const useCountExam = (args?: any, options?: any) => useModelQuery('Exam', 'count', args, options);
export const useFindManyExam = (args?: any, options?: any) => useModelQuery('Exam', 'findMany', args, options);
export const useFindUniqueExam = (args?: any, options?: any) => useModelQuery('Exam', 'findUnique', args, options);
export const useCreateExam = (options?: any) => useModelMutation('Exam', 'create', options);
export const useUpdateExam = (options?: any) => useModelMutation('Exam', 'update', options);
export const useDeleteExam = (options?: any) => useModelMutation('Exam', 'delete', options);

export const useCountQuestion = (args?: any, options?: any) => useModelQuery('Question', 'count', args, options);
export const useFindManyQuestion = (args?: any, options?: any) => useModelQuery('Question', 'findMany', args, options);
export const useCreateQuestion = (options?: any) => useModelMutation('Question', 'create', options);
export const useUpdateQuestion = (options?: any) => useModelMutation('Question', 'update', options);
export const useDeleteQuestion = (options?: any) => useModelMutation('Question', 'delete', options);

export const useCountSubmission = (args?: any, options?: any) => useModelQuery('Submission', 'count', args, options);
export const useFindManySubmission = (args?: any, options?: any) => useModelQuery('Submission', 'findMany', args, options);
export const useFindUniqueSubmission = (args?: any, options?: any) => useModelQuery('Submission', 'findUnique', args, options);
export const useDeleteSubmission = (options?: any) => useModelMutation('Submission', 'delete', options);

export const useFindManyExamRegistration = (args?: any, options?: any) => useModelQuery('ExamRegistration', 'findMany', args, options);
export const useCreateExamRegistration = (options?: any) => useModelMutation('ExamRegistration', 'create', options);
export const useUpdateExamRegistration = (options?: any) => useModelMutation('ExamRegistration', 'update', options);
export const useDeleteExamRegistration = (options?: any) => useModelMutation('ExamRegistration', 'delete', options);

export const useFindManyExamQuestions = (args?: any, options?: any) => useModelQuery('ExamQuestions', 'findMany', args, options);
export const useUpsertExamQuestions = (options?: any) => useModelMutation('ExamQuestions', 'upsert', options);
export const useDeleteManyExamQuestions = (options?: any) => useModelMutation('ExamQuestions', 'deleteMany', options);
