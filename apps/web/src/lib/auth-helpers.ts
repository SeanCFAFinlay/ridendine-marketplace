import { getCustomerByUserId } from '@ridendine/db';

export async function getCurrentCustomer(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const customer = await getCustomerByUserId(supabase, user.id);

  if (!customer) {
    throw new Error('Customer not found');
  }

  return customer;
}

export function handleApiError(error: unknown, defaultStatus = 500) {
  if (error instanceof Error) {
    if (error.message === 'Unauthorized') {
      return { error: 'Unauthorized', status: 401 };
    }

    return { error: error.message, status: 400 };
  }

  return { error: 'Internal server error', status: defaultStatus };
}
