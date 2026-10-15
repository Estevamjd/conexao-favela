type FunctionNotificationType = 'booking_cancelled' | 'booking_confirmed' | 'booking_created';

type LocalizedNotificationText = {
  readonly pt: string;
  readonly en: string;
  readonly es: string;
};

export type FunctionBookingNotificationContext = {
  readonly bookingId: string;
  readonly communityId: string;
  readonly guideId: string;
  readonly touristId: string;
  readonly tourId?: string;
};

export type FunctionBookingNotification = {
  readonly body: LocalizedNotificationText;
  readonly createdAt: Date;
  readonly data: Readonly<Record<string, string>>;
  readonly read: false;
  readonly title: LocalizedNotificationText;
  readonly type: FunctionNotificationType;
  readonly userId: string;
};

function buildNotificationData(context: FunctionBookingNotificationContext) {
  return {
    bookingId: context.bookingId,
    communityId: context.communityId,
    ...(context.tourId ? { tourId: context.tourId } : {}),
  };
}

export function buildBookingCreatedNotifications(
  context: FunctionBookingNotificationContext,
  options: { readonly createdAt?: Date } = {},
): readonly FunctionBookingNotification[] {
  const createdAt = options.createdAt ?? new Date();
  const data = buildNotificationData(context);

  return [
    {
      body: {
        en: 'A tourist sent a pending booking. Confirm it when the schedule is right.',
        es: 'Un turista envio una reserva pendiente. Confirmala cuando el horario este correcto.',
        pt: 'Um turista enviou uma reserva pendente. Confirme quando o horario estiver certo.',
      },
      createdAt,
      data,
      read: false,
      title: {
        en: 'New booking request',
        es: 'Nueva solicitud de reserva',
        pt: 'Nova reserva recebida',
      },
      type: 'booking_created',
      userId: context.guideId,
    },
    {
      body: {
        en: 'Your request was sent. The local guide will confirm the booking.',
        es: 'Tu solicitud fue enviada. El guia local confirmara la reserva.',
        pt: 'Sua solicitacao foi enviada. O guia local vai confirmar a reserva.',
      },
      createdAt,
      data,
      read: false,
      title: {
        en: 'Booking request sent',
        es: 'Solicitud de reserva enviada',
        pt: 'Reserva enviada',
      },
      type: 'booking_created',
      userId: context.touristId,
    },
  ];
}

export function buildBookingConfirmedNotifications(
  context: FunctionBookingNotificationContext,
  options: { readonly createdAt?: Date } = {},
): readonly FunctionBookingNotification[] {
  return [
    {
      body: {
        en: 'The guide confirmed your community tour.',
        es: 'El guia confirmo tu tour comunitario.',
        pt: 'O guia confirmou seu tour comunitario.',
      },
      createdAt: options.createdAt ?? new Date(),
      data: buildNotificationData(context),
      read: false,
      title: {
        en: 'Booking confirmed',
        es: 'Reserva confirmada',
        pt: 'Reserva confirmada',
      },
      type: 'booking_confirmed',
      userId: context.touristId,
    },
  ];
}

export function buildBookingCancelledNotifications(
  context: FunctionBookingNotificationContext,
  options: { readonly createdAt?: Date } = {},
): readonly FunctionBookingNotification[] {
  const createdAt = options.createdAt ?? new Date();
  const data = buildNotificationData(context);

  return [
    {
      body: {
        en: 'This booking was cancelled. Check the booking details for next steps.',
        es: 'Esta reserva fue cancelada. Revisa los detalles para los proximos pasos.',
        pt: 'Esta reserva foi cancelada. Veja os detalhes da reserva para proximos passos.',
      },
      createdAt,
      data,
      read: false,
      title: {
        en: 'Booking cancelled',
        es: 'Reserva cancelada',
        pt: 'Reserva cancelada',
      },
      type: 'booking_cancelled',
      userId: context.touristId,
    },
    {
      body: {
        en: 'This booking was cancelled and is no longer active in your schedule.',
        es: 'Esta reserva fue cancelada y ya no esta activa en tu agenda.',
        pt: 'Esta reserva foi cancelada e nao esta mais ativa na sua agenda.',
      },
      createdAt,
      data,
      read: false,
      title: {
        en: 'Booking cancelled',
        es: 'Reserva cancelada',
        pt: 'Reserva cancelada',
      },
      type: 'booking_cancelled',
      userId: context.guideId,
    },
  ];
}
