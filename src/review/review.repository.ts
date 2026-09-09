import { Injectable } from '@nestjs/common';
import { Review } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Review | null> {
    return this.prisma.review.findUnique({
      where: { id },
    });
  }

  async findByUserAndItinerary(
    userId: string,
    itineraryId: string,
  ): Promise<Review | null> {
    return this.prisma.review.findUnique({
      where: { userId_itineraryId: { userId, itineraryId } },
    });
  }

  async findAllByItineraryId(itineraryId: string): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { itineraryId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    itineraryId: string,
    userId: string,
    dto: CreateReviewDto,
  ): Promise<Review> {
    return this.prisma.review.create({
      data: {
        itineraryId,
        userId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateReviewDto): Promise<Review> {
    return this.prisma.review.update({
      where: { id },
      data: {
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.comment !== undefined && { comment: dto.comment }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.review.delete({
      where: { id },
    });
  }
}
