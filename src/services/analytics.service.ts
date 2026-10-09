import { db } from '../db/knex.js';

interface UserRoleFilter {
  roleName?: string;
  status?: string;
  isActive?: number;
  stateId?: number;
}

interface LearnerStatsFilter {
  stateId?: number;
  districtId?: number;
  blockId?: number;
}

export class AnalyticsService {
  /**
   * Filtered user counts queried directly from user_additional_roles joined with directus_roles
   */
  static async getUserStatistics(filters: UserRoleFilter) {
    let query = db('user_additional_roles as uar')
      .leftJoin('directus_roles as r', 'uar.role', 'r.id')
      .where('uar.is_deleted', 0);

    if (filters.status && filters.status !== 'all') {
      query = query.andWhere('uar.status', filters.status);
    }

    if (filters.isActive !== undefined) {
      query = query.andWhere('uar.is_active', filters.isActive);
    }

    if (filters.stateId && filters.stateId !== 0) {
      query = query.andWhere('uar.state', filters.stateId);
    }

    if (filters.roleName && filters.roleName !== 'all') {
      query = query.andWhere((builder) => {
        builder.whereILike('r.name', `%${filters.roleName}%`)
               .orWhereILike('r.role_code', `%${filters.roleName}%`);
      });
    }

    const result = await query.countDistinct('uar.user as totalUsers').first();

    return {
      metric: 'user_count',
      filtersApplied: filters,
      count: Number(result?.totalUsers || 0),
    };
  }

  /**
   * Complete breakdown grouped by role name, status, and active flag
   */
  static async getUserCountsGroupedByRole() {
    const records = await db('user_additional_roles as uar')
      .leftJoin('directus_roles as r', 'uar.role', 'r.id')
      .where('uar.is_deleted', 0)
      .groupBy('r.name', 'uar.status', 'uar.is_active')
      .select(
        'r.name as role_name',
        'uar.status',
        'uar.is_active',
        db.raw('count(DISTINCT uar.user) as total_users')
      );

    return {
      metric: 'user_breakdown_by_role',
      records,
    };
  }

  /**
   * Aggregated learner metrics from master_district or master_schools
   */
  static async getLearnerMetrics(filters: LearnerStatsFilter) {
    let query = db('master_district');

    if (filters.stateId) {
      query = query.where('state_id', filters.stateId);
    }
    if (filters.districtId) {
      query = query.where('district_id', filters.districtId);
    }

    const result = await query
      .sum('total_learner as totalLearners')
      .sum('identified_learner as totalIdentified')
      .sum('pass as totalPassed')
      .sum('pass_with_grace as totalPassedWithGrace')
      .first();

    return {
      metric: 'learner_metrics',
      filtersApplied: filters,
      totalLearners: Number(result?.totalLearners || 0),
      totalIdentified: Number(result?.totalIdentified || 0),
      totalPassed: Number(result?.totalPassed || 0),
      totalPassedWithGrace: Number(result?.totalPassedWithGrace || 0),
    };
  }
}